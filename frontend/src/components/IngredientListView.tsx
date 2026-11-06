"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Download, FileDown, Plus, RotateCcw, Search, Upload } from "lucide-react";
import { FilterSelect, FreshnessTabs, SortRadios, StorageChips } from "@/components/filters";
import { IngredientCreateDialog } from "@/components/IngredientCreateDialog";
import { IngredientActionDialog, IngredientDetailDialog, IngredientListItems } from "@/components/ingredient";
import { Button, ConfirmDialog, EmptyState, ErrorBanner, FormMessage, Input, LoadingBlock, PageHeader, Pagination, cardClass } from "@/components/ui";
import { api } from "@/lib/api";
import { quantityLabel, STORAGE_LABEL } from "@/lib/format";
import type { Category, Ingredient, IngredientList, MergeSuggestion, SortKey } from "@/lib/types";

const CSV_TEMPLATE = [
  "name,category,quantity,unit,storageType,purchasedAt,expirationDate,status,memo",
  "우유,유제품,1,개,REFRIGERATED,2026-11-01,2026-11-10,ACTIVE,예시 행",
  "당근,채소,2,개,REFRIGERATED,,,ACTIVE,",
].join("\n");

export function IngredientListView({ mode = "active" }: { mode?: "active" | "consumed" }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fileRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<IngredientList | null>(null);
  const [keyword, setKeyword] = useState(params.get("keyword") ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [actingId, setActingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Ingredient | null>(null);
  const [confirm, setConfirm] = useState<null | { id: string; action: "consume" | "restore" | "delete"; maxQuantity?: number; unit?: string }>(null);
  const [mergeTarget, setMergeTarget] = useState<MergeSuggestion | null>(null);
  const [mergePending, setMergePending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitial, setCreateInitial] = useState<Partial<Ingredient> | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [merges, setMerges] = useState<MergeSuggestion[]>([]);
  const [bulkPending, setBulkPending] = useState(false);

  function openCreate(initial?: Partial<Ingredient>) {
    setCreateInitial(
      initial
        ? {
            name: initial.name,
            categoryId: initial.categoryId,
            quantity: initial.quantity,
            unit: initial.unit,
            storageType: initial.storageType,
            purchasedAt: null,
            expirationDate: null,
            memo: null,
          }
        : undefined,
    );
    setCreateOpen(true);
  }

  const queryKey = params.toString();

  useEffect(() => {
    setKeyword(params.get("keyword") ?? "");
  }, [params]);

  useEffect(() => {
    let active = true;
    api.categories().then((items) => {
      if (active) setCategories(items);
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSelectedIds([]);
    const query = new URLSearchParams(queryKey);
    query.set("status", mode === "consumed" ? "CONSUMED" : "ACTIVE");
    if (!query.get("sort")) query.set("sort", "expirationDate");
    api
      .ingredients(query)
      .then((next) => {
        if (active) setData(next);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [queryKey, reloadKey, mode]);

  useEffect(() => {
    if (mode !== "active") {
      setMerges([]);
      return;
    }
    api
      .mergeSuggestions()
      .then(setMerges)
      .catch((reason: Error) => {
        setMerges([]);
        setError((prev) => prev || reason.message);
      });
  }, [mode, reloadKey]);

  function replaceQuery(updates: Record<string, string | null>, resetPage = true) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  const filtersActive = Boolean(
    keyword.trim() ||
      params.get("keyword") ||
      params.get("categoryId") ||
      params.get("sort") ||
      params.get("storageType") ||
      (mode === "active" && params.get("freshness")),
  );

  function resetFilters() {
    setKeyword("");
    replaceQuery({
      keyword: null,
      categoryId: null,
      sort: null,
      storageType: null,
      freshness: null,
    });
  }

  useEffect(() => {
    if (mode !== "active" || params.get("create") !== "1") return;
    openCreate();
    const next = new URLSearchParams(params.toString());
    next.delete("create");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [mode, params, pathname, router]);

  async function runConfirm(quantity?: number, outcome: import("@/lib/types").ConsumeOutcome = "USED") {
    if (!confirm) return;
    setActingId(confirm.id);
    setError("");
    setNotice("");
    try {
      if (confirm.action === "delete") {
        await api.deleteIngredient(confirm.id);
        setNotice("휴지통으로 이동했습니다.");
      } else if (confirm.action === "consume") {
        const result = await api.consume(confirm.id, quantity, outcome);
        if (result.status === "ACTIVE") {
          setNotice(`부분 소비했습니다. 남은 수량 ${quantityLabel(result.quantity, result.unit)}`);
        } else {
          setNotice(outcome === "WASTED" ? "폐기로 기록했습니다." : "소비 완료했습니다.");
        }
      } else {
        await api.restore(confirm.id);
        setNotice("보유 목록으로 복구했습니다.");
      }
      setPreview(null);
      setConfirm(null);
      setReloadKey((value) => value + 1);
    } catch (reason) {
      setError((reason as Error).message);
      setConfirm(null);
    } finally {
      setActingId(null);
    }
  }

  async function runBulk(action: "consume" | "waste" | "delete" | "restore") {
    if (selectedIds.length === 0) return;
    setBulkPending(true);
    setError("");
    setNotice("");
    try {
      const result = await api.bulkIngredients(action, selectedIds);
      const label =
        action === "consume" ? "소비 완료" : action === "waste" ? "폐기" : action === "delete" ? "삭제" : "복구";
      setNotice(`${result.successCount}개를 ${label}했습니다.${result.failureCount > 0 ? ` (${result.failureCount}개 실패)` : ""}`);
      setSelectedIds([]);
      setReloadKey((value) => value + 1);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBulkPending(false);
    }
  }

  async function runMerge() {
    if (!mergeTarget) return;
    setMergePending(true);
    setError("");
    setNotice("");
    try {
      const merged = await api.mergeIngredients(mergeTarget.items.map((item) => item.id));
      setNotice(`${merged.name} ${mergeTarget.items.length}건을 합쳤습니다. (${quantityLabel(merged.quantity, merged.unit)})`);
      setMergeTarget(null);
      setReloadKey((value) => value + 1);
    } catch (reason) {
      setError((reason as Error).message);
      setMergeTarget(null);
    } finally {
      setMergePending(false);
    }
  }

  function downloadBlob(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportCsv() {
    try {
      const result = await api.exportIngredients();
      downloadBlob(result.csv, `naengteol-ingredients-${new Date().toISOString().slice(0, 10)}.csv`);
      setNotice(`${result.count}개 식재료를 내보냈습니다.`);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  function downloadTemplate() {
    downloadBlob(`${CSV_TEMPLATE}\n`, "naengteol-ingredients-template.csv");
    setNotice("CSV 템플릿을 다운로드했습니다.");
  }

  async function importCsv(file: File) {
    setError("");
    setNotice("");
    try {
      const csv = await file.text();
      const result = await api.importIngredients(csv);
      setReloadKey((value) => value + 1);
      if (result.errorCount > 0) {
        setError(`${result.createdCount}개 등록, ${result.errorCount}개 실패`);
      } else {
        setNotice(`${result.createdCount}개를 가져왔습니다.`);
      }
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const searching = Boolean(params.get("keyword"));
  const emptyTitle = searching ? "검색 결과가 없습니다" : mode === "consumed" ? "소비 완료한 식재료가 없습니다" : "등록된 식재료가 없습니다";
  const emptyDescription = searching
    ? "검색어나 필터 조건을 변경해 다시 검색해 보세요."
    : mode === "consumed"
      ? "소비 완료한 식재료가 이곳에 표시됩니다."
      : "식재료를 등록하고 유통기한을 관리해 보세요.";

  return (
    <div className="grid gap-6">
      <PageHeader
        title={mode === "consumed" ? "소비 완료" : "식재료"}
        description={
          mode === "consumed"
            ? "소비 완료한 식재료를 확인하고, 보유 목록으로 복구할 수 있습니다."
            : "등록된 식재료를 유통기한과 보관 장소별로 확인하고 관리할 수 있습니다."
        }
        action={
          mode === "consumed" ? undefined : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={downloadTemplate}>
                <FileDown />
                CSV 템플릿
              </Button>
              <Button type="button" variant="secondary" onClick={exportCsv}>
                <Download />
                CSV 내보내기
              </Button>
              <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
                <Upload />
                CSV 가져오기
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void importCsv(file);
                  event.target.value = "";
                }}
              />
              <Button type="button" onClick={() => openCreate()}>
                <Plus />
                식재료 등록
              </Button>
            </div>
          )
        }
      />

      {mode === "active" ? (
        <FreshnessTabs
          value={params.get("freshness") ?? ""}
          counts={data?.counts}
          onChange={(value) => replaceQuery({ freshness: value || null })}
        />
      ) : null}

      <form
        className={`${cardClass} grid gap-3 p-4 md:p-5`}
        onSubmit={(event) => {
          event.preventDefault();
          replaceQuery({ keyword: keyword.trim() || null });
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <FilterSelect
            label="카테고리"
            className="sm:w-40"
            selected={Boolean(params.get("categoryId"))}
            value={params.get("categoryId") ?? ""}
            onChange={(value) => replaceQuery({ categoryId: value || null })}
            options={[{ value: "", label: "전체" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]}
          />
          <div className="min-w-0 flex-1">
            <span className="mb-1.5 block text-xs font-medium text-slate-500">검색</span>
            <div className="flex items-center gap-2">
              <Input
                variant="filter"
                className="min-w-0 flex-1"
                value={keyword}
                placeholder="식재료명으로 검색"
                onChange={(event) => setKeyword(event.target.value)}
              />
              <Button type="submit" className="shrink-0">
                <Search />
                검색
              </Button>
              <Button type="button" variant="secondary" className="shrink-0" disabled={!filtersActive} onClick={resetFilters}>
                <RotateCcw />
                초기화
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <SortRadios
            value={(params.get("sort") as SortKey | null) ?? "expirationDate"}
            onChange={(value) => replaceQuery({ sort: value === "expirationDate" ? null : value })}
          />
          <div className="hidden h-6 w-px shrink-0 bg-slate-200 sm:block" aria-hidden="true" />
          <StorageChips value={params.get("storageType") ?? ""} onChange={(value) => replaceQuery({ storageType: value || null })} />
        </div>
      </form>

      {mode === "active" && merges.length > 0 ? (
        <div className={`${cardClass} grid gap-3 p-4 md:p-5`}>
          <h2 className="text-sm font-semibold text-slate-800">같은 이름 합치기 제안</h2>
          {merges.map((group) => (
            <div key={group.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-slate-800">
                  {group.name} · {quantityLabel(group.totalQuantity, group.unit)}
                </p>
                <p className="text-muted">
                  {group.categoryName} · {STORAGE_LABEL[group.storageType]} · {group.items.length}건
                </p>
              </div>
              <Button type="button" variant="secondary" onClick={() => setMergeTarget(group)}>
                합치기
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-brand/20 bg-brand-light px-4 py-3">
          <span className="text-sm font-medium text-brand">{selectedIds.length}개 선택</span>
          {mode === "active" ? (
            <>
              <Button type="button" variant="secondary" disabled={bulkPending} onClick={() => runBulk("consume")}>
                일괄 소비
              </Button>
              <Button type="button" variant="secondary" disabled={bulkPending} onClick={() => runBulk("waste")}>
                일괄 폐기
              </Button>
              <Button type="button" variant="outlineDanger" disabled={bulkPending} onClick={() => runBulk("delete")}>
                일괄 삭제
              </Button>
            </>
          ) : (
            <Button type="button" variant="secondary" disabled={bulkPending} onClick={() => runBulk("restore")}>
              일괄 복구
            </Button>
          )}
          <Button type="button" variant="quiet" onClick={() => setSelectedIds([])}>
            선택 해제
          </Button>
        </div>
      ) : null}

      {notice ? <FormMessage>{notice}</FormMessage> : null}
      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
      {loading ? <LoadingBlock /> : null}

      {!loading && data && data.items.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={
            searching ? undefined : mode === "consumed" ? (
              <Button href="/ingredients">식재료 목록 보기</Button>
            ) : (
              <Button type="button" onClick={() => openCreate()}>
                <Plus />
                식재료 등록
              </Button>
            )
          }
        />
      ) : null}

      {!loading && data && data.items.length > 0 ? (
        <>
          <IngredientListItems
            items={data.items}
            mode={mode}
            page={data.pagination.page}
            limit={data.pagination.limit}
            actingId={actingId}
            selectedIds={selectedIds}
            onToggle={(id) => setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]))}
            onToggleAll={setSelectedIds}
            onOpen={setPreview}
            onReregister={(item) => openCreate(item)}
            onAction={(item) =>
              setConfirm({
                id: item.id,
                action: mode === "consumed" ? "restore" : "consume",
                maxQuantity: mode === "active" ? item.quantity : undefined,
                unit: item.unit,
              })
            }
          />
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            onPage={(page) => replaceQuery({ page: String(page) }, false)}
          />
        </>
      ) : null}
      {preview ? (
        <IngredientDetailDialog
          item={preview}
          categories={categories}
          onClose={() => setPreview(null)}
          onConsume={() =>
            setConfirm({
              id: preview.id,
              action: preview.status === "CONSUMED" ? "restore" : "consume",
              maxQuantity: preview.status === "ACTIVE" ? preview.quantity : undefined,
              unit: preview.unit,
            })
          }
          onDelete={() => setConfirm({ id: preview.id, action: "delete" })}
          onSaved={(updated) => {
            setPreview(updated);
            setReloadKey((value) => value + 1);
          }}
        />
      ) : null}
      {confirm ? (
        <IngredientActionDialog
          action={confirm.action}
          pending={actingId === confirm.id}
          maxQuantity={confirm.maxQuantity}
          unit={confirm.unit}
          onClose={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      ) : null}
      {mergeTarget ? (
        <ConfirmDialog
          title="식재료 합치기"
          description={`${mergeTarget.name} ${mergeTarget.items.length}건을 하나로 합칠까요?\n합친 뒤 수량은 ${quantityLabel(mergeTarget.totalQuantity, mergeTarget.unit)}이 되고, 가장 빠른 유통기한을 유지합니다.`}
          confirmLabel="합치기"
          tone="primary"
          pending={mergePending}
          onClose={() => setMergeTarget(null)}
          onConfirm={() => void runMerge()}
        />
      ) : null}
      <IngredientCreateDialog
        open={createOpen}
        initial={createInitial}
        onClose={() => {
          setCreateOpen(false);
          setCreateInitial(undefined);
        }}
        onCreated={(item) => {
          setNotice(`${item.name}을(를) 등록했습니다.`);
          setReloadKey((value) => value + 1);
          setPreview(item);
        }}
      />
    </div>
  );
}
