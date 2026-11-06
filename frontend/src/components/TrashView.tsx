"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Card, ConfirmDialog, EmptyState, ErrorBanner, FormMessage, LoadingBlock, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, quantityLabel } from "@/lib/format";
import type { Ingredient } from "@/lib/types";

export function TrashView() {
  const [items, setItems] = useState<Ingredient[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<null | { ids: string[]; label: string }>(null);

  function load() {
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ status: "DELETED", sort: "createdAt", limit: "50" });
    api
      .ingredients(query)
      .then((data) => {
        setItems(data.items);
        setSelected([]);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));
  }

  async function restoreIds(ids: string[]) {
    if (ids.length === 0) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await api.bulkIngredients("restore", ids);
      setNotice(`${result.successCount}개를 복구했습니다.${result.failureCount > 0 ? ` (${result.failureCount}개 실패)` : ""}`);
      load();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function purgeIds(ids: string[]) {
    if (ids.length === 0) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await api.bulkIngredients("purge", ids);
      setNotice(`${result.successCount}개를 영구 삭제했습니다.${result.failureCount > 0 ? ` (${result.failureCount}개 실패)` : ""}`);
      setPurgeTarget(null);
      load();
    } catch (reason) {
      setError((reason as Error).message);
      setPurgeTarget(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="휴지통"
        description="삭제한 식재료를 복구하거나 영구 삭제할 수 있습니다."
        action={
          selected.length > 0 ? (
            <div className="flex gap-2">
              <Button type="button" variant="secondary" disabled={pending} onClick={() => restoreIds(selected)}>
                복구 ({selected.length})
              </Button>
              <Button
                type="button"
                variant="outlineDanger"
                disabled={pending}
                onClick={() => setPurgeTarget({ ids: selected, label: `선택한 ${selected.length}개` })}
              >
                <Trash2 />
                영구 삭제
              </Button>
            </div>
          ) : undefined
        }
      />
      {notice ? <FormMessage>{notice}</FormMessage> : null}
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock /> : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="휴지통이 비어 있습니다"
          description="삭제한 식재료가 여기에 보관됩니다."
          action={<Button href="/ingredients">식재료 목록 보기</Button>}
        />
      ) : null}
      {!loading && items.length > 0 ? (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3 md:px-5">
                <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} className="size-4 accent-brand" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-800">{item.name}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {item.categoryName} · {quantityLabel(item.quantity, item.unit)} · {formatDate(item.expirationDate)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="secondary" disabled={pending} onClick={() => restoreIds([item.id])}>
                    복구
                  </Button>
                  <Button
                    type="button"
                    variant="outlineDanger"
                    disabled={pending}
                    onClick={() => setPurgeTarget({ ids: [item.id], label: item.name })}
                  >
                    영구 삭제
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      {purgeTarget ? (
        <ConfirmDialog
          title="영구 삭제"
          description={`${purgeTarget.label}을(를) 영구 삭제할까요?\n복구할 수 없습니다.`}
          confirmLabel="영구 삭제"
          pending={pending}
          onClose={() => setPurgeTarget(null)}
          onConfirm={() => void purgeIds(purgeTarget.ids)}
        />
      ) : null}
    </div>
  );
}
