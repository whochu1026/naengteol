"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { IngredientActionButton, IngredientActionDialog, IngredientDetailDialog } from "@/components/ingredient";
import { Button, Card, EmptyState, ErrorBanner, LoadingBlock, PageHeader, SelectionBar, StatusBadge, Toast, useToastNotice } from "@/components/ui";
import { api } from "@/lib/api";
import { daysLabel, formatDate, quantityLabel } from "@/lib/format";
import type { Category, ConsumeOutcome, Ingredient } from "@/lib/types";

type Range = "today" | "week";

function parseRange(value: string | null): Range {
  return value === "week" ? "week" : "today";
}

export function PlanView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = parseRange(searchParams.get("range"));
  const [items, setItems] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useToastNotice();
  const [preview, setPreview] = useState<Ingredient | null>(null);
  const [confirm, setConfirm] = useState<null | {
    id: string;
    action: "consume" | "delete";
    maxQuantity?: number;
    unit?: string;
    initialOutcome?: ConsumeOutcome;
  }>(null);
  const [pending, setPending] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);

  function setRange(next: Range) {
    router.replace(next === "today" ? "/plan?range=today" : "/plan?range=week");
  }

  function load() {
    setLoading(true);
    setError("");
    setSelectedIds([]);
    const query = new URLSearchParams({
      status: "ACTIVE",
      sort: "expirationDate",
      limit: "50",
      dueWithin: range === "today" ? "0" : "7",
    });
    api
      .ingredients(query)
      .then((data) => setItems(data.items))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [range]);

  useEffect(() => {
    api.categories().then(setCategories).catch(() => undefined);
  }, []);

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? items.map((item) => item.id) : []);
  }

  async function runConfirm(quantity?: number, outcome: ConsumeOutcome = "USED") {
    if (!confirm) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (confirm.action === "delete") {
        await api.deleteIngredient(confirm.id);
        setNotice("휴지통으로 이동했습니다.");
      } else {
        const result = await api.consume(confirm.id, quantity, outcome);
        if (result.status === "ACTIVE") {
          setNotice(`부분 소비했습니다. 남은 수량 ${quantityLabel(result.quantity, result.unit)}`);
        } else {
          setNotice(outcome === "WASTED" ? "폐기로 기록했습니다." : "소비 완료했습니다.");
        }
      }
      setConfirm(null);
      setPreview(null);
      load();
    } catch (reason) {
      setError((reason as Error).message);
      setConfirm(null);
    } finally {
      setPending(false);
    }
  }

  async function runBulk(action: "consume" | "waste") {
    if (selectedIds.length === 0) return;
    setBulkPending(true);
    setError("");
    setNotice("");
    try {
      const result = await api.bulkIngredients(action, selectedIds);
      setNotice(
        `${result.successCount}개를 ${action === "waste" ? "폐기" : "소비 완료"}했습니다.${
          result.failureCount > 0 ? ` (${result.failureCount}개 실패)` : ""
        }`,
      );
      load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="오늘·이번 주 먹을 것"
        description={
          <>
            유통기한이 다가온 재료를 먹거나,
            <br className="sm:hidden" /> 이미 못 쓰겠다면 폐기로 남겨두세요.
          </>
        }
      />
      <div className="flex gap-2">
        <Button type="button" variant="chip" selected={range === "today"} onClick={() => setRange("today")}>
          오늘까지
        </Button>
        <Button type="button" variant="chip" selected={range === "week"} onClick={() => setRange("week")}>
          이번 주
        </Button>
      </div>
      <Toast message={notice} />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title={range === "today" ? "오늘까지인 재료가 없습니다" : "이번 주 안에 먹을 재료가 없습니다"}
          description="유통기한이 임박한 재료가 생기면 여기에 모입니다."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button href="/ingredients">식재료 목록 보기</Button>
              {range === "today" ? (
                <Button href="/plan?range=week" variant="secondary">
                  이번 주 보기
                </Button>
              ) : null}
            </div>
          }
        />
      ) : null}
      {!loading && items.length > 0 ? (
        <>
          {selectedIds.length > 0 ? (
            <SelectionBar count={selectedIds.length} onClear={() => setSelectedIds([])}>
              <Button type="button" variant="brand" size="sm" disabled={bulkPending} onClick={() => runBulk("consume")}>
                <Check />
                일괄 소비
              </Button>
              <Button type="button" variant="outlineDanger" size="sm" disabled={bulkPending} onClick={() => runBulk("waste")}>
                일괄 폐기
              </Button>
            </SelectionBar>
          ) : null}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 md:px-5">
              <input
                type="checkbox"
                className="size-4 accent-brand"
                checked={selectedIds.length === items.length}
                onChange={(event) => toggleAll(event.target.checked)}
                aria-label="전체 선택"
              />
              <span className="text-sm text-muted">전체 선택</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-4 py-3 md:items-center md:px-5">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 shrink-0 accent-brand md:mt-0"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggle(item.id)}
                    aria-label={`${item.name} 선택`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center md:gap-3">
                    <button type="button" className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left hover:bg-slate-50" onClick={() => setPreview(item)}>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium break-keep text-slate-800">{item.name}</span>
                        <StatusBadge freshness={item.freshness} />
                      </span>
                      <span className="mt-0.5 block text-sm break-keep text-muted">
                        {item.categoryName} · {quantityLabel(item.quantity, item.unit)} · {formatDate(item.expirationDate)} ·{" "}
                        {daysLabel(item.daysLeft)}
                      </span>
                    </button>
                    <div className="flex flex-wrap justify-end gap-2 md:shrink-0">
                      <IngredientActionButton
                        label="소비"
                        onClick={() =>
                          setConfirm({ id: item.id, action: "consume", maxQuantity: item.quantity, unit: item.unit, initialOutcome: "USED" })
                        }
                      />
                      <Button
                        type="button"
                        variant="outlineDanger"
                        size="sm"
                        onClick={() =>
                          setConfirm({ id: item.id, action: "consume", maxQuantity: item.quantity, unit: item.unit, initialOutcome: "WASTED" })
                        }
                      >
                        폐기
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : null}
      {preview ? (
        <IngredientDetailDialog
          item={preview}
          categories={categories}
          onClose={() => setPreview(null)}
          onConsume={() =>
            setConfirm({ id: preview.id, action: "consume", maxQuantity: preview.quantity, unit: preview.unit, initialOutcome: "USED" })
          }
          onDelete={() => setConfirm({ id: preview.id, action: "delete" })}
          onSaved={(updated) => {
            setPreview(updated);
            load();
          }}
        />
      ) : null}
      {confirm ? (
        <IngredientActionDialog
          key={`${confirm.id}-${confirm.initialOutcome ?? "USED"}`}
          action={confirm.action}
          pending={pending}
          maxQuantity={confirm.maxQuantity}
          unit={confirm.unit}
          initialOutcome={confirm.initialOutcome}
          onClose={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      ) : null}
    </div>
  );
}
