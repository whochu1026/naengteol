import { randomUUID } from "crypto";
import { categoryRepository } from "../repositories/category.repository";
import { ingredientRepository } from "../repositories/ingredient.repository";
import { DEFAULT_NOTIFICATION_SETTINGS } from "./auth.service";
import { userRepository } from "../repositories/user.repository";
import type {
  ConsumeOutcome,
  Freshness,
  Ingredient,
  IngredientDto,
  IngredientStatus,
  SortKey,
  StorageType,
} from "../types";
import { AppError } from "../utils/errors";
import { daysLeftOf, diffDays, freshnessOf, seoulToday } from "../utils/expiration";

export interface IngredientInput {
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  purchasedAt?: string | null;
  expirationDate?: string | null;
  storageType: StorageType;
  memo?: string | null;
}

export interface IngredientPatch {
  name?: string;
  categoryId?: string;
  quantity?: number;
  unit?: string;
  purchasedAt?: string | null;
  expirationDate?: string | null;
  storageType?: StorageType;
  memo?: string | null;
}

export interface ListQuery {
  keyword?: string;
  categoryId?: string;
  storageType?: StorageType;
  status?: IngredientStatus | "ALL";
  freshness?: Freshness;
  outcome?: ConsumeOutcome;
  consumedWithin?: number;
  dueWithin?: number;
  sort?: SortKey;
  page?: number;
  limit?: number;
}

function toDto(ingredient: Ingredient, categoryName: string, today: string): IngredientDto {
  return {
    ...ingredient,
    categoryName,
    freshness: freshnessOf(ingredient.expirationDate, today),
    daysLeft: daysLeftOf(ingredient.expirationDate, today),
    consumedAt: ingredient.consumedAt ?? null,
    outcome:
      ingredient.status === "CONSUMED" ? (ingredient.outcome ?? "USED") : (ingredient.outcome ?? null),
  };
}

function templateKey(row: Pick<Ingredient, "name" | "unit" | "categoryId" | "storageType">) {
  return [row.name.trim().toLowerCase(), row.unit, row.categoryId, row.storageType].join("|");
}

async function categoryNameMap(): Promise<Map<string, string>> {
  const categories = await categoryRepository.list();
  return new Map(categories.map((category) => [category.id, category.name]));
}

async function ownedOr404(userId: string, id: string): Promise<Ingredient> {
  const ingredient = await ingredientRepository.findById(id);
  if (!ingredient || ingredient.userId !== userId) {
    throw new AppError(404, "식재료를 찾을 수 없습니다.");
  }
  return ingredient;
}

async function assertCategory(categoryId: string): Promise<void> {
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    throw new AppError(400, "입력값을 확인해 주세요.", [
      { field: "categoryId", message: "존재하지 않는 카테고리입니다." },
    ]);
  }
}

function assertDateOrder(purchasedAt: string | null, expirationDate: string | null): void {
  if (purchasedAt && expirationDate && expirationDate < purchasedAt) {
    throw new AppError(400, "입력값을 확인해 주세요.", [
      { field: "expirationDate", message: "유통기한은 구매일보다 빠를 수 없습니다." },
    ]);
  }
}

function sortIngredients(rows: Ingredient[], sort: SortKey): Ingredient[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name, "ko");
    if (sort === "createdAt") return b.createdAt.localeCompare(a.createdAt);
    if (sort === "consumedAt") {
      const left = a.consumedAt ?? a.updatedAt;
      const right = b.consumedAt ?? b.updatedAt;
      return right.localeCompare(left);
    }
    if (!a.expirationDate && !b.expirationDate) return 0;
    if (!a.expirationDate) return 1;
    if (!b.expirationDate) return -1;
    const direction = sort === "expirationDateDesc" ? -1 : 1;
    if (a.expirationDate === b.expirationDate) return 0;
    return a.expirationDate < b.expirationDate ? -direction : direction;
  });
  return copy;
}

function mergeKey(row: Ingredient) {
  return [row.name.trim().toLowerCase(), row.unit, row.categoryId, row.storageType].join("|");
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (char === "\r") continue;
    cell += char;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((item) => item.some((value) => value.trim()));
}

export const ingredientService = {
  async list(userId: string, query: ListQuery) {
    const today = seoulToday();
    const names = await categoryNameMap();
    const status = query.status ?? "ACTIVE";
    const sort = query.sort ?? "expirationDate";
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const keyword = query.keyword?.trim().toLowerCase();

    let rows = await ingredientRepository.listByUser(userId);
    if (status !== "ALL") rows = rows.filter((row) => row.status === status);
    if (query.categoryId) rows = rows.filter((row) => row.categoryId === query.categoryId);
    if (query.storageType) rows = rows.filter((row) => row.storageType === query.storageType);
    if (keyword) rows = rows.filter((row) => row.name.toLowerCase().includes(keyword));

    const counts = { total: rows.length, fresh: 0, expiring: 0, expired: 0, unknown: 0 };
    for (const row of rows) {
      const freshness = freshnessOf(row.expirationDate, today);
      if (freshness === "FRESH") counts.fresh += 1;
      else if (freshness === "EXPIRING") counts.expiring += 1;
      else if (freshness === "EXPIRED") counts.expired += 1;
      else counts.unknown += 1;
    }

    if (query.consumedWithin !== undefined) {
      rows = rows.filter((row) => {
        const stamp = (row.consumedAt ?? row.updatedAt ?? "").slice(0, 10);
        if (!stamp) return false;
        return diffDays(stamp, today) <= query.consumedWithin!;
      });
    }

    const outcomeCounts = { total: rows.length, used: 0, wasted: 0 };
    for (const row of rows) {
      if ((row.outcome ?? "USED") === "WASTED") outcomeCounts.wasted += 1;
      else outcomeCounts.used += 1;
    }

    if (query.freshness) {
      rows = rows.filter((row) => freshnessOf(row.expirationDate, today) === query.freshness);
    }
    if (query.outcome) {
      rows = rows.filter((row) => (row.outcome ?? "USED") === query.outcome);
    }
    if (query.dueWithin !== undefined) {
      rows = rows.filter((row) => {
        const days = daysLeftOf(row.expirationDate, today);
        if (days === null) return false;
        // 0 = 오늘까지(당일만). 1 이상은 이미 지난 항목도 포함.
        if (query.dueWithin === 0) return days === 0;
        return days <= query.dueWithin!;
      });
    }

    rows = sortIngredients(rows, sort);
    const total = rows.length;
    const start = (page - 1) * limit;
    const items = rows.slice(start, start + limit).map((row) => toDto(row, names.get(row.categoryId) ?? "기타", today));

    return {
      items,
      counts,
      outcomeCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  },

  async get(userId: string, id: string): Promise<IngredientDto> {
    const today = seoulToday();
    const names = await categoryNameMap();
    const ingredient = await ownedOr404(userId, id);
    return toDto(ingredient, names.get(ingredient.categoryId) ?? "기타", today);
  },

  async create(userId: string, input: IngredientInput): Promise<IngredientDto> {
    await assertCategory(input.categoryId);
    const purchasedAt = input.purchasedAt ?? null;
    const expirationDate = input.expirationDate ?? null;
    assertDateOrder(purchasedAt, expirationDate);
    const now = new Date().toISOString();
    const created = await ingredientRepository.create({
      id: randomUUID(),
      userId,
      categoryId: input.categoryId,
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      purchasedAt,
      expirationDate,
      storageType: input.storageType,
      status: "ACTIVE",
      memo: input.memo ?? null,
      consumedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    const names = await categoryNameMap();
    return toDto(created, names.get(created.categoryId) ?? "기타", seoulToday());
  },

  async update(userId: string, id: string, patch: IngredientPatch): Promise<IngredientDto> {
    const current = await ownedOr404(userId, id);
    if (current.status === "DELETED") {
      throw new AppError(400, "휴지통에 있는 식재료는 수정할 수 없습니다.");
    }
    if (patch.categoryId) await assertCategory(patch.categoryId);
    const next: Ingredient = { ...current, updatedAt: new Date().toISOString() };
    if (patch.name !== undefined) next.name = patch.name;
    if (patch.categoryId !== undefined) next.categoryId = patch.categoryId;
    if (patch.quantity !== undefined) next.quantity = patch.quantity;
    if (patch.unit !== undefined) next.unit = patch.unit;
    if (patch.purchasedAt !== undefined) next.purchasedAt = patch.purchasedAt;
    if (patch.expirationDate !== undefined) next.expirationDate = patch.expirationDate;
    if (patch.storageType !== undefined) next.storageType = patch.storageType;
    if (patch.memo !== undefined) next.memo = patch.memo;
    assertDateOrder(next.purchasedAt, next.expirationDate);
    const saved = await ingredientRepository.save(next);
    const names = await categoryNameMap();
    return toDto(saved, names.get(saved.categoryId) ?? "기타", seoulToday());
  },

  async remove(userId: string, id: string): Promise<void> {
    const current = await ownedOr404(userId, id);
    if (current.status === "DELETED") {
      throw new AppError(400, "이미 휴지통에 있는 식재료입니다.");
    }
    await ingredientRepository.save({
      ...current,
      status: "DELETED",
      updatedAt: new Date().toISOString(),
    });
  },

  async purge(userId: string, id: string): Promise<void> {
    const current = await ownedOr404(userId, id);
    if (current.status !== "DELETED") {
      throw new AppError(400, "휴지통에 있는 식재료만 영구 삭제할 수 있습니다.");
    }
    await ingredientRepository.deleteById(id);
  },

  async consume(
    userId: string,
    id: string,
    quantity?: number,
    outcome: ConsumeOutcome = "USED",
  ): Promise<IngredientDto> {
    const current = await ownedOr404(userId, id);
    if (current.status !== "ACTIVE") {
      throw new AppError(400, "보유 중인 식재료만 소비할 수 있습니다.");
    }
    if (quantity === undefined || quantity >= current.quantity) {
      return this.setStatus(userId, id, "CONSUMED", outcome);
    }
    if (outcome === "WASTED") {
      throw new AppError(400, "부분 폐기는 지원하지 않습니다. 전량 폐기하거나 수량을 수정해 주세요.");
    }
    const saved = await ingredientRepository.save({
      ...current,
      quantity: Number((current.quantity - quantity).toFixed(2)),
      updatedAt: new Date().toISOString(),
    });
    const names = await categoryNameMap();
    return toDto(saved, names.get(saved.categoryId) ?? "기타", seoulToday());
  },

  async restore(userId: string, id: string): Promise<IngredientDto> {
    const current = await ownedOr404(userId, id);
    if (current.status === "ACTIVE") {
      throw new AppError(400, "이미 보유 중인 식재료입니다.");
    }
    const saved = await ingredientRepository.save({
      ...current,
      status: "ACTIVE",
      consumedAt: null,
      outcome: null,
      updatedAt: new Date().toISOString(),
    });
    const names = await categoryNameMap();
    return toDto(saved, names.get(saved.categoryId) ?? "기타", seoulToday());
  },

  async bulk(
    userId: string,
    action: "consume" | "waste" | "delete" | "restore" | "purge",
    ids: string[],
  ) {
    const results: { id: string; ok: boolean; message?: string }[] = [];
    for (const id of ids) {
      try {
        if (action === "consume") await this.consume(userId, id, undefined, "USED");
        else if (action === "waste") await this.consume(userId, id, undefined, "WASTED");
        else if (action === "delete") await this.remove(userId, id);
        else if (action === "restore") await this.restore(userId, id);
        else await this.purge(userId, id);
        results.push({ id, ok: true });
      } catch (error) {
        results.push({ id, ok: false, message: (error as Error).message });
      }
    }
    return {
      action,
      successCount: results.filter((row) => row.ok).length,
      failureCount: results.filter((row) => !row.ok).length,
      results,
    };
  },

  async mergeSuggestions(userId: string) {
    const today = seoulToday();
    const names = await categoryNameMap();
    const active = (await ingredientRepository.listByUser(userId)).filter((row) => row.status === "ACTIVE");
    const groups = new Map<string, Ingredient[]>();
    for (const row of active) {
      const key = mergeKey(row);
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }
    return [...groups.values()]
      .filter((group) => group.length > 1)
      .map((group) => ({
        key: mergeKey(group[0]),
        name: group[0].name,
        unit: group[0].unit,
        categoryName: names.get(group[0].categoryId) ?? "기타",
        storageType: group[0].storageType,
        totalQuantity: group.reduce((sum, item) => sum + item.quantity, 0),
        items: group.map((item) => toDto(item, names.get(item.categoryId) ?? "기타", today)),
      }));
  },

  async merge(userId: string, ids: string[]) {
    const today = seoulToday();
    const names = await categoryNameMap();
    const items = [];
    for (const id of ids) items.push(await ownedOr404(userId, id));
    if (items.some((item) => item.status !== "ACTIVE")) {
      throw new AppError(400, "보유 중인 식재료만 합칠 수 있습니다.");
    }
    const key = mergeKey(items[0]);
    if (items.some((item) => mergeKey(item) !== key)) {
      throw new AppError(400, "이름·단위·카테고리·보관 장소가 같은 식재료만 합칠 수 있습니다.");
    }
    const [target, ...rest] = items;
    const quantity = Number(items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2));
    const memos = items.map((item) => item.memo).filter(Boolean);
    const saved = await ingredientRepository.save({
      ...target,
      quantity,
      memo: memos.length ? [...new Set(memos)].join(" / ") : target.memo,
      updatedAt: new Date().toISOString(),
    });
    for (const item of rest) {
      await ingredientRepository.deleteById(item.id);
    }
    return toDto(saved, names.get(saved.categoryId) ?? "기타", today);
  },

  async stats(userId: string) {
    const today = seoulToday();
    const names = await categoryNameMap();
    const rows = await ingredientRepository.listByUser(userId);
    const active = rows.filter((row) => row.status === "ACTIVE");
    const consumed = rows.filter((row) => row.status === "CONSUMED");
    const used = consumed.filter((row) => (row.outcome ?? "USED") === "USED");
    const wasted = consumed.filter((row) => row.outcome === "WASTED");
    const deleted = rows.filter((row) => row.status === "DELETED");
    const expiredActive = active.filter((row) => freshnessOf(row.expirationDate, today) === "EXPIRED").length;
    const dueSoon = active.filter((row) => {
      const days = daysLeftOf(row.expirationDate, today);
      return days !== null && days <= 7;
    }).length;
    const finished = used.length + wasted.length;
    const listed = await categoryRepository.list();
    const byCategory = listed.map((category) => ({
      name: category.name,
      active: active.filter((row) => row.categoryId === category.id).length,
      consumed: consumed.filter((row) => row.categoryId === category.id).length,
      used: used.filter((row) => row.categoryId === category.id).length,
      wasted: wasted.filter((row) => row.categoryId === category.id).length,
      deleted: deleted.filter((row) => row.categoryId === category.id).length,
    }));
    return {
      active: active.length,
      consumed: consumed.length,
      used: used.length,
      wasted: wasted.length,
      deleted: deleted.length,
      savedRate: finished === 0 ? null : Math.round((used.length / finished) * 100),
      expiredActive,
      dueSoon,
      byCategory: byCategory.filter(
        (row) => row.active + row.consumed + row.deleted > 0,
      ),
      recentConsumed: sortIngredients(consumed, "createdAt")
        .slice(0, 5)
        .map((row) => toDto(row, names.get(row.categoryId) ?? "기타", today)),
    };
  },

  async quickTemplates(userId: string) {
    const names = await categoryNameMap();
    const rows = (await ingredientRepository.listByUser(userId)).filter((row) => row.status !== "DELETED");
    const groups = new Map<
      string,
      {
        name: string;
        categoryId: string;
        unit: string;
        storageType: StorageType;
        quantity: number;
        count: number;
        lastUsedAt: string;
      }
    >();
    for (const row of rows) {
      const key = templateKey(row);
      const existing = groups.get(key);
      const stamp = row.consumedAt ?? row.updatedAt ?? row.createdAt;
      if (!existing) {
        groups.set(key, {
          name: row.name,
          categoryId: row.categoryId,
          unit: row.unit,
          storageType: row.storageType,
          quantity: row.quantity,
          count: 1,
          lastUsedAt: stamp,
        });
      } else {
        existing.count += 1;
        if (stamp > existing.lastUsedAt) {
          existing.lastUsedAt = stamp;
          existing.quantity = row.quantity;
          existing.name = row.name;
        }
      }
    }
    return [...groups.values()]
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count;
        return right.lastUsedAt.localeCompare(left.lastUsedAt);
      })
      .slice(0, 12)
      .map((row) => ({
        ...row,
        categoryName: names.get(row.categoryId) ?? "기타",
      }));
  },

  async alerts(userId: string) {
    const user = await userRepository.findById(userId);
    const settings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...user?.notificationSettings,
    };
    const today = seoulToday();
    const names = await categoryNameMap();
    const active = (await ingredientRepository.listByUser(userId)).filter((row) => row.status === "ACTIVE");
    const d3 = settings.notifyD3
      ? active
          .filter((row) => daysLeftOf(row.expirationDate, today) === 3)
          .map((row) => toDto(row, names.get(row.categoryId) ?? "기타", today))
      : [];
    const d0 = settings.notifyD0
      ? active
          .filter((row) => {
            const days = daysLeftOf(row.expirationDate, today);
            return days !== null && days <= 0;
          })
          .map((row) => toDto(row, names.get(row.categoryId) ?? "기타", today))
      : [];
    return { settings, d3, d0, today };
  },

  async exportCsv(userId: string) {
    const names = await categoryNameMap();
    const rows = (await ingredientRepository.listByUser(userId)).filter((row) => row.status !== "DELETED");
    const header = ["name", "category", "quantity", "unit", "storageType", "purchasedAt", "expirationDate", "status", "memo"];
    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [
          csvEscape(row.name),
          csvEscape(names.get(row.categoryId) ?? "기타"),
          String(row.quantity),
          csvEscape(row.unit),
          row.storageType,
          row.purchasedAt ?? "",
          row.expirationDate ?? "",
          row.status,
          csvEscape(row.memo ?? ""),
        ].join(","),
      ),
    ];
    return { csv: `${lines.join("\n")}\n`, count: rows.length };
  },

  async importCsv(userId: string, csv: string, options: { dryRun?: boolean } = {}) {
    const categories = await categoryRepository.list();
    const byName = new Map(categories.map((category) => [category.name, category]));
    const rows = parseCsv(csv);
    if (rows.length < 2) {
      throw new AppError(400, "가져올 데이터가 없습니다.");
    }
    const header = rows[0].map((value) => value.trim().toLowerCase());
    const index = {
      name: header.indexOf("name"),
      category: header.indexOf("category"),
      quantity: header.indexOf("quantity"),
      unit: header.indexOf("unit"),
      storageType: header.indexOf("storagetype"),
      purchasedAt: header.indexOf("purchasedat"),
      expirationDate: header.indexOf("expirationdate"),
      memo: header.indexOf("memo"),
    };
    if (index.name < 0 || index.category < 0 || index.quantity < 0 || index.unit < 0 || index.storageType < 0) {
      throw new AppError(400, "CSV 헤더에 name, category, quantity, unit, storageType이 필요합니다.");
    }
    const created = [];
    const preview: {
      line: number;
      ok: boolean;
      name: string;
      category: string;
      quantity: string;
      unit: string;
      storageType: string;
      message?: string;
    }[] = [];
    const errors: { line: number; message: string }[] = [];
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const line = i + 1;
      const name = row[index.name]?.trim() || "";
      const categoryName = row[index.category]?.trim() || "";
      const quantityRaw = row[index.quantity]?.trim() || "";
      const unit = row[index.unit]?.trim() || "";
      const storageRaw = row[index.storageType]?.trim().toUpperCase() || "";
      try {
        if (!name) throw new Error("식재료명을 입력해 주세요.");
        if (!unit) throw new Error("단위를 입력해 주세요.");
        const quantity = Number(quantityRaw);
        if (!quantityRaw || Number.isNaN(quantity) || quantity <= 0) {
          throw new Error("수량은 0보다 커야 합니다.");
        }
        const category = byName.get(categoryName);
        if (!category) throw new Error(`카테고리 '${categoryName}'를 찾을 수 없습니다.`);
        const storageType = storageRaw as StorageType;
        if (!["REFRIGERATED", "FROZEN", "ROOM"].includes(storageType)) {
          throw new Error("보관 장소가 올바르지 않습니다.");
        }
        const purchasedAt = index.purchasedAt >= 0 ? row[index.purchasedAt]?.trim() || null : null;
        const expirationDate = index.expirationDate >= 0 ? row[index.expirationDate]?.trim() || null : null;
        assertDateOrder(purchasedAt, expirationDate);
        const input = {
          name,
          categoryId: category.id,
          quantity,
          unit,
          storageType,
          purchasedAt,
          expirationDate,
          memo: index.memo >= 0 ? row[index.memo]?.trim() || null : null,
        };
        preview.push({
          line,
          ok: true,
          name,
          category: categoryName,
          quantity: quantityRaw,
          unit,
          storageType: storageRaw,
        });
        if (!options.dryRun) {
          const item = await this.create(userId, input);
          created.push(item);
        }
      } catch (error) {
        const message = (error as Error).message;
        errors.push({ line, message });
        preview.push({
          line,
          ok: false,
          name,
          category: categoryName,
          quantity: quantityRaw,
          unit,
          storageType: storageRaw,
          message,
        });
      }
    }
    return {
      dryRun: Boolean(options.dryRun),
      createdCount: created.length,
      validCount: preview.filter((row) => row.ok).length,
      errorCount: errors.length,
      errors,
      preview: preview.slice(0, 100),
      items: created.slice(0, 20),
    };
  },

  async summary(userId: string) {
    const today = seoulToday();
    const names = await categoryNameMap();
    const active = (await ingredientRepository.listByUser(userId)).filter((row) => row.status === "ACTIVE");
    const counts = { total: active.length, fresh: 0, expiring: 0, expired: 0, unknown: 0 };
    for (const row of active) {
      const freshness = freshnessOf(row.expirationDate, today);
      if (freshness === "FRESH") counts.fresh += 1;
      if (freshness === "EXPIRING") counts.expiring += 1;
      if (freshness === "EXPIRED") counts.expired += 1;
      if (freshness === "UNKNOWN") counts.unknown += 1;
    }
    const expiringItems = sortIngredients(
      active.filter((row) => freshnessOf(row.expirationDate, today) === "EXPIRING"),
      "expirationDate",
    )
      .slice(0, 5)
      .map((row) => toDto(row, names.get(row.categoryId) ?? "기타", today));

    const dueToday = sortIngredients(
      active.filter((row) => daysLeftOf(row.expirationDate, today) === 0),
      "expirationDate",
    )
      .slice(0, 5)
      .map((row) => toDto(row, names.get(row.categoryId) ?? "기타", today));

    const dueWeek = sortIngredients(
      active.filter((row) => {
        const days = daysLeftOf(row.expirationDate, today);
        return days !== null && days <= 7;
      }),
      "expirationDate",
    )
      .slice(0, 5)
      .map((row) => toDto(row, names.get(row.categoryId) ?? "기타", today));

    const recentItems = [...active]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, 5)
      .map((row) => toDto(row, names.get(row.categoryId) ?? "기타", today));
    const listed = await categoryRepository.list();
    const categories = listed.map((category) => ({
      name: category.name,
      count: active.filter((row) => row.categoryId === category.id).length,
    }));

    return { ...counts, expiringItems, recentItems, categories, dueToday, dueWeek };
  },

  async setStatus(
    userId: string,
    id: string,
    status: Ingredient["status"],
    outcome: ConsumeOutcome = "USED",
  ): Promise<IngredientDto> {
    const current = await ownedOr404(userId, id);
    if (current.status === status) {
      throw new AppError(
        400,
        status === "CONSUMED" ? "이미 소비 완료된 식재료입니다." : "이미 보유 중인 식재료입니다.",
      );
    }
    const saved = await ingredientRepository.save({
      ...current,
      status,
      consumedAt: status === "CONSUMED" ? seoulToday() : null,
      outcome: status === "CONSUMED" ? outcome : null,
      updatedAt: new Date().toISOString(),
    });
    const names = await categoryNameMap();
    return toDto(saved, names.get(saved.categoryId) ?? "기타", seoulToday());
  },
};
