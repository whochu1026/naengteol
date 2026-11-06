"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IngredientActionDialog, IngredientFacts } from "@/components/ingredient";
import { ArrowLeft, Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button, ErrorBanner, FormMessage, LoadingBlock, StatusBadge, brandTextLinkClass } from "@/components/ui";
import { api } from "@/lib/api";
import { quantityLabel } from "@/lib/format";
import type { Ingredient } from "@/lib/types";

export function IngredientDetailView({ id }: { id: string }) {
  const router = useRouter();
  const [item, setItem] = useState<Ingredient | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "consume" | "restore" | null>(null);

  function load() {
    setLoading(true);
    setError("");
    api
      .ingredient(id)
      .then(setItem)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function runAction(quantity?: number, outcome: import("@/lib/types").ConsumeOutcome = "USED") {
    if (!confirm) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (confirm === "delete") {
        await api.deleteIngredient(id);
        router.replace("/ingredients");
        return;
      }
      const next = confirm === "consume" ? await api.consume(id, quantity, outcome) : await api.restore(id);
      if (confirm === "consume" && next.status === "ACTIVE") {
        setNotice(`부분 소비했습니다. 남은 수량 ${quantityLabel(next.quantity, next.unit)}`);
      } else if (confirm === "consume") {
        setNotice(outcome === "WASTED" ? "폐기로 기록했습니다." : "소비 완료했습니다.");
      } else {
        setNotice("보유 목록으로 복구했습니다.");
      }
      setItem(next);
      setConfirm(null);
    } catch (reason) {
      setError((reason as Error).message);
      setConfirm(null);
    } finally {
      setPending(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (!item) return <ErrorBanner message={error || "식재료를 찾을 수 없습니다."} onRetry={load} />;

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/ingredients" className={`inline-flex items-center gap-1 text-sm ${brandTextLinkClass}`}>
            <ArrowLeft className="size-3.5" />
            목록으로
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-slate-800">{item.name}</h1>
            <StatusBadge freshness={item.freshness} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href={`/ingredients/${item.id}/edit`} variant="secondary">
            <Pencil />
            수정
          </Button>
          {item.status === "ACTIVE" ? (
            <Button onClick={() => setConfirm("consume")}>
              <Check />
              소비 완료
            </Button>
          ) : item.status === "CONSUMED" || item.status === "DELETED" ? (
            <Button onClick={() => setConfirm("restore")}>
              <RotateCcw />
              보유로 되돌리기
            </Button>
          ) : null}
          {item.status !== "DELETED" ? (
            <Button variant="danger" onClick={() => setConfirm("delete")}>
              <Trash2 />
              삭제
            </Button>
          ) : null}
        </div>
      </div>
      {notice ? <FormMessage>{notice}</FormMessage> : null}
      {error ? <ErrorBanner message={error} /> : null}
      <IngredientFacts item={item} layout="page" />
      {confirm ? (
        <IngredientActionDialog
          action={confirm}
          pending={pending}
          maxQuantity={confirm === "consume" ? item.quantity : undefined}
          unit={item.unit}
          onClose={() => setConfirm(null)}
          onConfirm={runAction}
        />
      ) : null}
    </div>
  );
}
