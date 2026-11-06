"use client";

import { useEffect, useState } from "react";
import { Check, ChevronRight, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { IngredientForm } from "@/components/IngredientForm";
import { Button, ConfirmDialog, Field, Input, Modal, StatusBadge, cardClass } from "@/components/ui";
import { api } from "@/lib/api";
import { daysLabel, formatDate, OUTCOME_LABEL, quantityLabel, STATUS_LABEL, STORAGE_LABEL } from "@/lib/format";
import type { Category, ConsumeOutcome, Ingredient, IngredientInput } from "@/lib/types";

export type IngredientAction = "consume" | "restore" | "delete";

const ACTION_COPY: Record<IngredientAction, { title: string; description: string; confirmLabel: string; tone: "danger" | "primary" }> = {
  delete: {
    title: "식재료 삭제",
    description: "삭제한 식재료는 휴지통으로 이동합니다.",
    confirmLabel: "삭제",
    tone: "danger",
  },
  consume: {
    title: "소비·폐기",
    description: "먹었는지 버렸는지 기록하면 통계에 반영됩니다.",
    confirmLabel: "확인",
    tone: "primary",
  },
  restore: {
    title: "보유로 되돌리기",
    description: "다시 보유 중인 식재료로 표시합니다.",
    confirmLabel: "확인",
    tone: "primary",
  },
};

export function ingredientDetailRows(item: Ingredient) {
  return [
    ["카테고리", item.categoryName],
    ["수량", quantityLabel(item.quantity, item.unit)],
    ["보관 장소", STORAGE_LABEL[item.storageType]],
    ["구매일", formatDate(item.purchasedAt)],
    ["유통기한", `${formatDate(item.expirationDate)} · ${daysLabel(item.daysLeft)}`],
    ["보유 상태", STATUS_LABEL[item.status]],
    [
      "처리",
      item.status === "CONSUMED" && item.outcome ? OUTCOME_LABEL[item.outcome] : item.status === "CONSUMED" ? "먹음" : "없음",
    ],
    ["소비일", item.consumedAt ? formatDate(item.consumedAt) : "없음"],
    ["메모", item.memo || "없음"],
  ];
}

export function IngredientFacts({ item, layout }: { item: Ingredient; layout: "page" | "dialog" }) {
  const rows = ingredientDetailRows(item);
  if (layout === "page") {
    return (
      <dl className={`${cardClass} divide-y divide-slate-100 overflow-hidden`}>
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-5 py-3 sm:grid-cols-[140px_1fr] sm:gap-4">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className="text-sm text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <dl className="divide-y divide-slate-100">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[88px_1fr] items-baseline gap-3 py-3 text-sm">
          <dt className="font-medium text-slate-500">{label}</dt>
          <dd className="min-w-0 break-words text-slate-800">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function IngredientNameButton({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="link"
      className="max-w-full underline decoration-brand underline-offset-2 hover:bg-brand-light/60"
      aria-haspopup="dialog"
      aria-label={`${name} 상세 보기`}
      title="상세 보기"
      onClick={onClick}
    >
      <span className="truncate">{name}</span>
      <ChevronRight className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
    </Button>
  );
}

export function IngredientStatus({ item }: { item: Ingredient }) {
  const outcomeLabel = item.status === "CONSUMED" ? (item.outcome === "WASTED" ? "폐기" : "먹음") : null;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <StatusBadge freshness={item.freshness} />
      {outcomeLabel ? <span className="text-xs text-slate-400">{outcomeLabel}</span> : null}
    </span>
  );
}

export function IngredientActionButton({
  label,
  pending = false,
  className = "",
  onClick,
}: {
  label: string;
  pending?: boolean;
  className?: string;
  onClick: () => void;
}) {
  const isRestore = label.includes("되돌리");
  return (
    <Button variant="compact" className={className} disabled={pending} onClick={onClick}>
      {pending ? (
        "처리 중..."
      ) : (
        <>
          {isRestore ? <RotateCcw /> : <Check />}
          {label}
        </>
      )}
    </Button>
  );
}

export function IngredientActionDialog({
  action,
  pending,
  confirmLabel,
  maxQuantity,
  unit,
  initialOutcome = "USED",
  onClose,
  onConfirm,
}: {
  action: IngredientAction;
  pending?: boolean;
  confirmLabel?: string;
  maxQuantity?: number;
  unit?: string;
  initialOutcome?: ConsumeOutcome;
  onClose: () => void;
  onConfirm: (quantity?: number, outcome?: ConsumeOutcome) => void;
}) {
  const copy = ACTION_COPY[action];
  const [quantity, setQuantity] = useState("");
  const [outcome, setOutcome] = useState<ConsumeOutcome>(initialOutcome);
  const allowPartial = action === "consume" && typeof maxQuantity === "number" && maxQuantity > 0 && outcome === "USED";

  if (action !== "consume") {
    return (
      <ConfirmDialog
        title={copy.title}
        description={copy.description}
        confirmLabel={confirmLabel ?? copy.confirmLabel}
        tone={copy.tone}
        pending={pending}
        onClose={onClose}
        onConfirm={() => onConfirm()}
      />
    );
  }

  return (
    <Modal titleId="consume-title" onClose={onClose} panelClassName="w-full max-w-md cursor-default rounded-3xl bg-white p-6 shadow-xl">
      <h2 id="consume-title" className="text-lg font-semibold text-slate-800">
        {outcome === "WASTED" ? "폐기" : "소비 완료"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {outcome === "WASTED"
          ? "버렸다면 폐기로 기록합니다. 통계의 절약률에 반영됩니다."
          : "먹었다면 소비로 기록합니다. 수량을 비우면 전량 처리합니다."}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" variant="chip" selected={outcome === "USED"} onClick={() => setOutcome("USED")}>
          먹었어요
        </Button>
        <Button type="button" variant="chip" selected={outcome === "WASTED"} onClick={() => setOutcome("WASTED")}>
          버렸어요
        </Button>
      </div>
      {allowPartial ? (
        <Field label="소비 수량" className="mt-4" hint={`비워 두면 전량(${maxQuantity}${unit ?? ""}) 소비합니다.`}>
          <Input
            inputMode="decimal"
            value={quantity}
            placeholder={`최대 ${maxQuantity}${unit ?? ""}`}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          취소
        </Button>
        <Button
          variant={outcome === "WASTED" ? "dangerSolid" : "primary"}
          disabled={pending}
          onClick={() => {
            const parsed = quantity.trim() ? Number(quantity) : undefined;
            onConfirm(Number.isFinite(parsed) ? parsed : undefined, outcome);
          }}
        >
          {pending ? "처리 중..." : confirmLabel ?? (outcome === "WASTED" ? "폐기" : "소비 완료")}
        </Button>
      </div>
    </Modal>
  );
}

export function IngredientDetailDialog({
  item,
  categories,
  onClose,
  onConsume,
  onDelete,
  onSaved,
}: {
  item: Ingredient;
  categories: Category[];
  onClose: () => void;
  onConsume: () => void;
  onDelete: () => void;
  onSaved: (item: Ingredient) => void;
}) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [current, setCurrent] = useState(item);
  const [editCategories, setEditCategories] = useState<Category[]>(categories);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    setCurrent(item);
    setMode("view");
    setEditError("");
  }, [item]);

  useEffect(() => {
    setEditCategories(categories);
  }, [categories]);

  async function startEdit() {
    setEditError("");
    if (editCategories.length === 0) {
      try {
        const items = await api.categories();
        setEditCategories(items);
      } catch (reason) {
        setEditError((reason as Error).message);
        return;
      }
    }
    setMode("edit");
  }

  async function saveEdit(values: IngredientInput) {
    const updated = await api.updateIngredient(current.id, values);
    setCurrent(updated);
    onSaved(updated);
    setMode("view");
  }

  function handleClose() {
    if (mode === "edit") {
      setMode("view");
      setEditError("");
      return;
    }
    onClose();
  }

  return (
    <Modal
      titleId="ingredient-detail-title"
      onClose={handleClose}
      panelClassName="flex max-h-[90vh] w-full max-w-lg cursor-default flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0 pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="ingredient-detail-title" className="text-lg font-semibold text-slate-800">
              {mode === "edit" ? "식재료 수정" : current.name}
            </h2>
            {mode === "view" ? <StatusBadge freshness={current.freshness} /> : null}
          </div>
          {mode === "edit" ? (
            <p className="mt-1 text-sm text-slate-500">변경한 내용을 저장하면 목록에도 바로 반영됩니다.</p>
          ) : null}
        </div>
        <Button type="button" variant="quiet" size="icon" aria-label={mode === "edit" ? "수정 취소" : "닫기"} onClick={handleClose}>
          <X />
        </Button>
      </header>

      {mode === "view" ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
            <IngredientFacts item={current} layout="dialog" />
          </div>
          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-5 py-4">
            <Button type="button" variant="outlineDanger" onClick={onDelete}>
              <Trash2 />
              삭제
            </Button>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={startEdit}>
                <Pencil />
                수정
              </Button>
              <Button type="button" variant="brand" onClick={onConsume}>
                {current.status === "CONSUMED" ? (
                  <>
                    <RotateCcw />
                    보유로 되돌리기
                  </>
                ) : (
                  <>
                    <Check />
                    소비 완료
                  </>
                )}
              </Button>
            </div>
          </footer>
        </>
      ) : (
        <>
          {editError ? <p className="shrink-0 px-5 pt-4 text-sm text-red-600">{editError}</p> : null}
          {editCategories.length > 0 ? (
            <IngredientForm
              key={current.id}
              categories={editCategories}
              initial={current}
              submitLabel="저장"
              embedded
              onCancel={() => setMode("view")}
              onSubmit={saveEdit}
            />
          ) : null}
        </>
      )}
    </Modal>
  );
}

function actionLabel(mode: "active" | "consumed") {
  return mode === "consumed" ? "되돌리기" : "소비 완료";
}

export function IngredientListItems({
  items,
  mode,
  page,
  limit,
  actingId,
  selectedIds = [],
  onToggle,
  onToggleAll,
  onOpen,
  onAction,
  onReregister,
}: {
  items: Ingredient[];
  mode: "active" | "consumed";
  page: number;
  limit: number;
  actingId: string | null;
  selectedIds?: string[];
  onToggle?: (id: string) => void;
  onToggleAll?: (ids: string[]) => void;
  onOpen: (item: Ingredient) => void;
  onAction: (item: Ingredient) => void;
  onReregister?: (item: Ingredient) => void;
}) {
  const startNo = (Math.max(page, 1) - 1) * Math.max(limit, 1);
  const allSelected = items.length > 0 && items.every((item) => selectedIds.includes(item.id));
  const headers =
    mode === "consumed"
      ? ["", "No.", "식재료명", "카테고리", "수량", "보관 장소", "소비일", "상태", "관리"]
      : ["", "No.", "식재료명", "카테고리", "수량", "보관 장소", "유통기한", "상태", "관리"];
  return (
    <>
      <div className={`${cardClass} hidden overflow-hidden md:block`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 text-xs text-slate-500">
            <tr>
              {headers.map((label, index) => (
                <th key={`${label}-${index}`} className={`px-4 py-3.5 font-medium ${label === "No." ? "w-14 text-center" : ""} ${label === "" ? "w-10" : ""}`}>
                  {label === "" ? (
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => onToggleAll?.(allSelected ? [] : items.map((item) => item.id))}
                      className="size-4 accent-brand"
                      aria-label="전체 선택"
                    />
                  ) : (
                    label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => onToggle?.(item.id)}
                    className="size-4 accent-brand"
                    aria-label={`${item.name} 선택`}
                  />
                </td>
                <td className="px-4 py-3.5 text-center font-normal tabular-nums text-slate-500">{startNo + index + 1}</td>
                <td className="px-4 py-3.5 font-medium text-slate-800">
                  <IngredientNameButton name={item.name} onClick={() => onOpen(item)} />
                </td>
                <td className="px-4 py-3 font-normal text-slate-600">{item.categoryName}</td>
                <td className="px-4 py-3 font-normal tabular-nums text-slate-600">{quantityLabel(item.quantity, item.unit)}</td>
                <td className="px-4 py-3 font-normal text-slate-600">{STORAGE_LABEL[item.storageType]}</td>
                {mode === "consumed" ? (
                  <td className="px-4 py-3 font-normal tabular-nums text-slate-600">{formatDate(item.consumedAt)}</td>
                ) : (
                  <td className="px-4 py-3 font-normal tabular-nums text-slate-600">
                    {formatDate(item.expirationDate)}
                    <span className="mt-0.5 block text-xs font-normal text-slate-400">{daysLabel(item.daysLeft)}</span>
                  </td>
                )}
                <td className="px-4 py-3">
                  <IngredientStatus item={item} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {mode === "consumed" && onReregister ? (
                      <Button type="button" variant="secondary" onClick={() => onReregister(item)}>
                        다시 등록
                      </Button>
                    ) : null}
                    <IngredientActionButton label={actionLabel(mode)} pending={actingId === item.id} onClick={() => onAction(item)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {items.map((item, index) => (
          <li key={item.id} className={`${cardClass} p-4`}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggle?.(item.id)}
                className="mt-1 size-4 accent-brand"
                aria-label={`${item.name} 선택`}
              />
              <div className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="mb-1 block text-xs tabular-nums text-slate-400">No. {startNo + index + 1}</span>
                    <IngredientNameButton name={item.name} onClick={() => onOpen(item)} />
                    <span className="block text-sm text-slate-500">
                      {item.categoryName} · {quantityLabel(item.quantity, item.unit)} · {STORAGE_LABEL[item.storageType]}
                    </span>
                  </span>
                  <IngredientStatus item={item} />
                </span>
                <span className="mt-3 block text-sm text-slate-500">
                  {mode === "consumed" ? `소비일 ${formatDate(item.consumedAt)}` : `유통기한 ${formatDate(item.expirationDate)} · ${daysLabel(item.daysLeft)}`}
                </span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mode === "consumed" && onReregister ? (
                    <Button type="button" variant="secondary" onClick={() => onReregister(item)}>
                      다시 등록
                    </Button>
                  ) : null}
                  <IngredientActionButton label={actionLabel(mode)} pending={actingId === item.id} onClick={() => onAction(item)} />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
