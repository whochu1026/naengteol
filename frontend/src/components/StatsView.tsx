"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorBanner, LoadingBlock, PageHeader, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate, OUTCOME_LABEL, quantityLabel } from "@/lib/format";
import type { IngredientStats } from "@/lib/types";

export function StatsView() {
  const [data, setData] = useState<IngredientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    api
      .ingredientStats()
      .then(setData)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="grid gap-6">
      <PageHeader title="소비·폐기 통계" description="얼마나 먹었고, 얼마나 버렸는지 확인합니다." />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock /> : null}
      {data ? (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="보유" value={data.active} />
            <StatCard label="먹음" value={data.used} />
            <StatCard label="폐기" value={data.wasted} tone="text-red-600" />
            <StatCard
              label="절약률"
              value={data.savedRate === null ? "-" : `${data.savedRate}%`}
              tone="text-brand"
            />
            <StatCard label="만료 보유" value={data.expiredActive} tone="text-red-600" />
            <StatCard label="7일 이내" value={data.dueSoon} tone="text-amber-600" />
          </section>
          <p className="text-sm text-muted">
            절약률은 먹음 ÷ (먹음 + 폐기)입니다.
            {data.savedRate === null
              ? " 아직 소비·폐기 이력이 없으면 표시되지 않습니다."
              : ` 지금까지 먹음 ${data.used}개 · 폐기 ${data.wasted}개 기준입니다.`}
          </p>
          <Card className="p-5 md:p-6">
            <h2 className="text-base font-semibold text-foreground">카테고리별</h2>
            {data.byCategory.length === 0 ? (
              <p className="mt-4 text-sm text-muted">아직 통계로 볼 식재료가 없습니다.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {data.byCategory.map((category) => (
                  <li key={category.name} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="font-medium text-slate-800">{category.name}</span>
                    <span className="tabular-nums text-muted">
                      보유 {category.active} · 먹음 {category.used} · 폐기 {category.wasted}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">최근 소비·폐기</h2>
              <Button href="/consumed" variant="link">
                전체 보기
              </Button>
            </div>
            {data.recentConsumed.length === 0 ? (
              <p className="mt-4 text-sm text-muted">소비·폐기 이력이 없습니다.</p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {data.recentConsumed.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                    <span>
                      <span className="block font-medium text-slate-800">{item.name}</span>
                      <span className="text-sm text-muted">
                        {OUTCOME_LABEL[item.outcome ?? "USED"]} · {quantityLabel(item.quantity, item.unit)} ·{" "}
                        {formatDate(item.consumedAt)}
                      </span>
                    </span>
                    <StatusBadge freshness={item.freshness} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "text-foreground",
}: {
  label: string;
  value: number | string;
  tone?: string;
}) {
  return (
    <Card className="p-4 md:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
    </Card>
  );
}
