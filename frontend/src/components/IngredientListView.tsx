"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Download, FileDown, Plus, RotateCcw, Search, Trash2, Upload } from "lucide-react";
import { ConsumedPeriodChips, FilterSelect, FreshnessTabs, OutcomeTabs, SortRadios, StorageChips } from "@/components/filters";
import { IngredientCreateDialog } from "@/components/IngredientCreateDialog";
import { IngredientActionDialog, IngredientDetailDialog, IngredientListItems } from "@/components/ingredient";
import { Button, ConfirmDialog, EmptyState, ErrorBanner, Input, LoadingBlock, Modal, PageHeader, Pagination, SelectionBar, Toast, cardClass, useToastNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { quantityLabel, STORAGE_LABEL } from "@/lib/format";
import type { Category, Ingredient, IngredientList, MergeSuggestion, SortKey } from "@/lib/types";

type CsvPreview = Awaited<ReturnType<typeof api.importIngredients>>;

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
  const csvMenuRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [data, setData] = useState<IngredientList | null>(null);
  const [keyword, setKeyword] = useState(params.get("keyword") ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useToastNotice();
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
  const [csvMenuOpen, setCsvMenuOpen] = useState(false);
  const [csvGuideOpen, setCsvGuideOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [csvText, setCsvText] = useState("");
  const [csvPending, setCsvPending] = useState(false);
  const [filterOpen, setFilterOpen] = useState<boolean | null>(null);

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
    if (!csvMenuOpen) return;
    function close(event: MouseEvent) {
      if (!csvMenuRef.current?.contains(event.target as Node)) setCsvMenuOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [csvMenuOpen]);

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
    if (!query.get("sort")) query.set("sort", mode === "consumed" ? "consumedAt" : "expirationDate");
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

  const detailFilterParts = [
    (params.get("keyword") || keyword.trim()) && "검색",
    params.get("categoryId") && "카테고리",
    params.get("sort") && "정렬",
    params.get("storageType") && "보관",
    mode === "consumed" && params.get("consumedWithin") && "기간",
  ].filter(Boolean) as string[];
  const detailFiltersActive = detailFilterParts.length > 0;
  const filtersActive = Boolean(
    detailFiltersActive ||
      (mode === "active" && params.get("freshness")) ||
      (mode === "consumed" && params.get("outcome")),
  );
  const filtersExpanded = filterOpen ?? false;

  useEffect(() => {
    const hasDetail =
      Boolean(params.get("keyword")) ||
      Boolean(params.get("categoryId")) ||
      Boolean(params.get("sort")) ||
      Boolean(params.get("storageType")) ||
      Boolean(params.get("consumedWithin"));
    setFilterOpen(window.matchMedia("(min-width: 768px)").matches || hasDetail);
  }, []);

  function resetFilters() {
    setKeyword("");
    replaceQuery({
      keyword: null,
      categoryId: null,
      sort: null,
      storageType: null,
      freshness: null,
      outcome: null,
      consumedWithin: null,
    });
  }

  function resetDetailFilters() {
    setKeyword("");
    replaceQuery({
      keyword: null,
      categoryId: null,
      sort: null,
      storageType: null,
      consumedWithin: null,
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

  async function openCsvPreview(file: File) {
    setError("");
    setNotice("");
    setCsvPending(true);
    try {
      const csv = await file.text();
      const result = await api.importIngredients(csv, { dryRun: true });
      setCsvText(csv);
      setCsvPreview(result);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setCsvPending(false);
    }
  }

  async function confirmCsvImport() {
    if (!csvText) return;
    setCsvPending(true);
    setError("");
    setNotice("");
    try {
      const result = await api.importIngredients(csvText);
      setCsvPreview(null);
      setCsvText("");
      setReloadKey((value) => value + 1);
      if (result.errorCount > 0) {
        setError(`${result.createdCount}개 등록, ${result.errorCount}개 실패`);
      } else {
        setNotice(`${result.createdCount}개를 가져왔습니다.`);
      }
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setCsvPending(false);
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
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="relative" ref={csvMenuRef}>
                <Button type="button" variant="secondary" size="default" aria-expanded={csvMenuOpen} aria-haspopup="menu" onClick={() => setCsvMenuOpen((value) => !value)}>
                  CSV
                  <ChevronDown className="size-4" />
                </Button>
                {csvMenuOpen ? (
                  <div role="menu" className="absolute right-0 z-40 mt-2 w-36 rounded-[var(--radius-card)] border border-border bg-surface p-1.5 shadow-[var(--shadow-soft)]">
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm text-foreground hover:bg-brand-light"
                      onClick={() => {
                        setCsvMenuOpen(false);
                        downloadTemplate();
                      }}
                    >
                      <FileDown className="size-4" />
                      템플릿 받기
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm text-foreground hover:bg-brand-light"
                      onClick={() => {
                        setCsvMenuOpen(false);
                        void exportCsv();
                      }}
                    >
                      <Download className="size-4" />
                      내보내기
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm text-foreground hover:bg-brand-light"
                      onClick={() => {
                        setCsvMenuOpen(false);
                        setCsvGuideOpen(true);
                      }}
                    >
                      <Upload className="size-4" />
                      가져오기
                    </button>
                  </div>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    setCsvGuideOpen(false);
                    void openCsvPreview(file);
                  }
                  event.target.value = "";
                }}
              />
              <Button type="button" onClick={() => openCreate()} disabled={csvPending}>
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
      ) : (
        <OutcomeTabs
          value={params.get("outcome") ?? ""}
          counts={data?.outcomeCounts}
          onChange={(value) => replaceQuery({ outcome: value || null })}
        />
      )}

      <form
        className={`${cardClass} overflow-hidden`}
        onSubmit={(event) => {
          event.preventDefault();
          replaceQuery({ keyword: keyword.trim() || null });
          setFilterOpen(true);
        }}
      >
        <div className="flex items-center gap-1.5 px-4 py-3 md:gap-2 md:px-5">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            aria-expanded={filtersExpanded}
            onClick={() => setFilterOpen((value) => !(value ?? false))}
          >
            <Search className="size-4 shrink-0 text-brand" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">검색·필터</span>
                {detailFiltersActive ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-light px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-brand">
                    {detailFilterParts.length}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {detailFiltersActive
                  ? `${detailFilterParts.join(" · ")} 적용 중`
                  : "카테고리, 검색어, 정렬, 보관을 설정합니다"}
              </span>
            </span>
          </button>
          {detailFiltersActive ? (
            <Button
              type="button"
              variant="brand"
              size="sm"
              className="shrink-0"
              aria-label="검색·필터 초기화"
              onClick={resetDetailFilters}
            >
              <RotateCcw />
              초기화
            </Button>
          ) : null}
          <button
            type="button"
            className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] text-muted hover:bg-brand-light/70 hover:text-foreground"
            aria-label={filtersExpanded ? "검색·필터 접기" : "검색·필터 펼치기"}
            aria-expanded={filtersExpanded}
            onClick={() => setFilterOpen((value) => !(value ?? false))}
          >
            <ChevronDown className={`size-4 transition-transform ${filtersExpanded ? "rotate-180" : ""}`} aria-hidden />
          </button>
        </div>
        {filtersExpanded ? (
          <div className="grid gap-4 border-t border-slate-100 px-4 py-4 md:gap-5 md:px-5 md:py-5">
            <div className="grid gap-4 lg:grid-cols-[10rem_minmax(0,1fr)] lg:items-end">
              <FilterSelect
                label="카테고리"
                selected={Boolean(params.get("categoryId"))}
                value={params.get("categoryId") ?? ""}
                onChange={(value) => replaceQuery({ categoryId: value || null })}
                options={[{ value: "", label: "전체" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]}
              />
              <div className="min-w-0">
                <span className="mb-1.5 block text-xs font-medium text-slate-500">검색</span>
                <div className="flex flex-col gap-2 md:flex-row md:items-center">
                  <div className="min-w-0 w-full md:flex-1">
                    <Input
                      variant="filter"
                      value={keyword}
                      placeholder="식재료명으로 검색"
                      onChange={(event) => setKeyword(event.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 md:flex md:shrink-0">
                    <Button type="submit" className="w-full md:w-auto">
                      <Search />
                      검색
                    </Button>
                    <Button type="button" variant="secondary" className="w-full md:w-auto" disabled={!filtersActive} onClick={resetFilters}>
                      <RotateCcw />
                      초기화
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <SortRadios
                mode={mode}
                value={
                  (params.get("sort") as SortKey | null) ?? (mode === "consumed" ? "consumedAt" : "expirationDate")
                }
                onChange={(value) => {
                  const fallback = mode === "consumed" ? "consumedAt" : "expirationDate";
                  replaceQuery({ sort: value === fallback ? null : value });
                }}
              />
              {mode === "consumed" ? (
                <ConsumedPeriodChips
                  value={params.get("consumedWithin") ?? ""}
                  onChange={(value) => replaceQuery({ consumedWithin: value || null })}
                />
              ) : (
                <StorageChips value={params.get("storageType") ?? ""} onChange={(value) => replaceQuery({ storageType: value || null })} />
              )}
            </div>
          </div>
        ) : null}
      </form>

      {mode === "active" && merges.length > 0 ? (
        <div className={`${cardClass} grid gap-3 p-4 md:p-5`}>
          <h2 className="text-sm font-semibold text-slate-800">같은 이름 합치기 제안</h2>
          {merges.map((group) => (
            <div key={group.key} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] bg-slate-50 px-3 py-3">
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
        <SelectionBar count={selectedIds.length} onClear={() => setSelectedIds([])}>
          {mode === "active" ? (
            <>
              <Button type="button" variant="brand" size="sm" disabled={bulkPending} onClick={() => runBulk("consume")}>
                <Check />
                일괄 소비
              </Button>
              <Button type="button" variant="outlineDanger" size="sm" disabled={bulkPending} onClick={() => runBulk("waste")}>
                일괄 폐기
              </Button>
              <Button type="button" variant="quiet" size="sm" disabled={bulkPending} onClick={() => runBulk("delete")}>
                <Trash2 />
                일괄 삭제
              </Button>
            </>
          ) : (
            <Button type="button" variant="brand" size="sm" disabled={bulkPending} onClick={() => runBulk("restore")}>
              <RotateCcw />
              일괄 복구
            </Button>
          )}
        </SelectionBar>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
      <Toast message={notice} />
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
      {csvGuideOpen ? (
        <Modal
          titleId="csv-guide-title"
          onClose={() => setCsvGuideOpen(false)}
          panelClassName="flex max-h-[90vh] w-full max-w-lg cursor-default flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)]"
        >
          <header className="shrink-0 border-b border-slate-100 px-5 py-4 pr-14">
            <h2 id="csv-guide-title" className="text-lg font-semibold text-slate-800">
              CSV 가져오기
            </h2>
            <p className="mt-1 text-sm text-muted">엑셀·메모장 CSV로 식재료를 한 번에 등록합니다.</p>
          </header>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm leading-6 text-muted">
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">1</span>
                <div>
                  <p className="font-medium text-foreground">템플릿 받기</p>
                  <p className="mt-0.5">아래 버튼으로 예시 파일을 받은 뒤, 행만 추가·수정해 주세요.</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">2</span>
                <div>
                  <p className="font-medium text-foreground">필수 항목 채우기</p>
                  <ul className="mt-1.5 space-y-1">
                    <li>
                      <span className="font-medium text-foreground">이름 · 카테고리 · 수량 · 단위 · 보관 장소</span>
                    </li>
                    <li>
                      보관 장소는{" "}
                      <span className="font-medium text-foreground">
                        {STORAGE_LABEL.REFRIGERATED}(REFRIGERATED) · {STORAGE_LABEL.FROZEN}(FROZEN) · {STORAGE_LABEL.ROOM}(ROOM)
                      </span>{" "}
                      중 하나
                    </li>
                    <li>
                      카테고리는 앱에 있는 이름과 같아야 합니다
                      {categories.length > 0 ? (
                        <>
                          {" "}
                          (예: {categories.slice(0, 4).map((item) => item.name).join(", ")}
                          {categories.length > 4 ? " …" : ""})
                        </>
                      ) : null}
                    </li>
                  </ul>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">3</span>
                <div>
                  <p className="font-medium text-foreground">파일 선택 후 미리보기</p>
                  <p className="mt-0.5">오류 행은 건너뛰고, 유효한 행만 등록됩니다. 구매일·유통기한·메모는 선택입니다.</p>
                </div>
              </li>
            </ol>
            <div className="rounded-[var(--radius-control)] bg-slate-50 px-3.5 py-3 text-xs leading-5">
              <p className="font-medium text-foreground">열 이름 (영문 헤더)</p>
              <p className="mt-1 break-all text-muted">
                name, category, quantity, unit, storageType, purchasedAt, expirationDate, memo
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-100 px-5 py-4">
            <Button type="button" variant="secondary" onClick={downloadTemplate}>
              <FileDown />
              템플릿 받기
            </Button>
            <Button type="button" onClick={() => fileRef.current?.click()} disabled={csvPending}>
              <Upload />
              파일 선택
            </Button>
          </div>
        </Modal>
      ) : null}
      {csvPreview ? (
        <Modal
          titleId="csv-preview-title"
          closeDisabled={csvPending}
          onClose={() => {
            if (csvPending) return;
            setCsvPreview(null);
            setCsvText("");
          }}
          panelClassName="flex max-h-[90vh] w-full max-w-3xl cursor-default flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)]"
        >
          <header className="shrink-0 border-b border-slate-100 px-5 py-4 pr-14 md:px-6">
            <h2 id="csv-preview-title" className="text-lg font-semibold text-slate-800">
              CSV 가져오기 미리보기
            </h2>
            <p className="mt-1 text-sm text-muted">
              유효 {csvPreview.validCount}건 · 오류 {csvPreview.errorCount}건. 오류 행은 건너뛰고 유효한 행만 등록됩니다.
            </p>
          </header>
          <div className="min-h-0 flex-1 overflow-auto px-5 py-4 md:px-6">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[35%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead className="text-xs text-muted">
                <tr className="border-b border-slate-100">
                  <th className="px-2 py-2 text-center font-medium">No</th>
                  <th className="px-2 py-2 text-center font-medium">상태</th>
                  <th className="px-2 py-2 font-medium">이름</th>
                  <th className="px-2 py-2 text-center font-medium">카테고리</th>
                  <th className="px-2 py-2 text-center font-medium">수량</th>
                  <th className="px-2 py-2 font-medium">비고</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.preview.map((row, index) => (
                  <tr key={row.line} className="border-b border-slate-50 align-top">
                    <td className="px-2 py-2 text-center tabular-nums text-muted">{index + 1}</td>
                    <td className={`px-2 py-2 text-center font-medium ${row.ok ? "text-brand" : "text-red-600"}`}>{row.ok ? "OK" : "오류"}</td>
                    <td className="min-w-0 truncate px-2 py-2">{row.name || "-"}</td>
                    <td className="truncate px-2 py-2 text-center">{row.category || "-"}</td>
                    <td className="px-2 py-2 text-center tabular-nums">
                      {row.quantity || "-"}
                      {row.unit ? ` ${row.unit}` : ""}
                    </td>
                    <td className="min-w-0 truncate px-2 py-2 text-muted" title={row.message || STORAGE_LABEL[row.storageType as keyof typeof STORAGE_LABEL] || row.storageType || undefined}>
                      {row.message || STORAGE_LABEL[row.storageType as keyof typeof STORAGE_LABEL] || row.storageType || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4 md:px-6">
            <Button
              type="button"
              variant="outline"
              disabled={csvPending}
              onClick={() => {
                setCsvPreview(null);
                setCsvText("");
              }}
            >
              취소
            </Button>
            <Button type="button" disabled={csvPending || csvPreview.validCount === 0} onClick={() => void confirmCsvImport()}>
              {csvPending ? "등록 중..." : `${csvPreview.validCount}건 등록`}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
