"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  HelpCircle,
  History,
  LayoutGrid,
  Package,
  Plus,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { IngredientCreateDialog } from "@/components/IngredientCreateDialog";
import {
  IngredientActionButton,
  IngredientActionDialog,
  IngredientDetailDialog,
  type IngredientAction,
} from "@/components/ingredient";
import { Button, Card, EmptyState, ErrorBanner, LoadingBlock, PageHeader, StatusBadge, brandTextLinkClass, cardClass } from "@/components/ui";
import { api } from "@/lib/api";
import { daysLabel, formatDate, quantityLabel } from "@/lib/format";
import type { Category, ConsumeOutcome, DashboardSummary, Ingredient } from "@/lib/types";

export function DashboardView() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Ingredient | null>(null);
  const [confirm, setConfirm] = useState<null | {
    id: string;
    action: IngredientAction;
    maxQuantity?: number;
    unit?: string;
    initialOutcome?: ConsumeOutcome;
  }>(null);
  const [pending, setPending] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  function load() {
    setLoading(true);
    setError("");
    api
      .dashboard()
      .then(setData)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    let active = true;
    api
      .categories()
      .then((items) => {
        if (active) setCategories(items);
      })
      .catch((reason: Error) => {
        if (active) setError((prev) => prev || reason.message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function runConfirm(quantity?: number, outcome: import("@/lib/types").ConsumeOutcome = "USED") {
    if (!confirm) return;
    setPending(true);
    setError("");
    try {
      if (confirm.action === "delete") await api.deleteIngredient(confirm.id);
      else if (confirm.action === "consume") await api.consume(confirm.id, quantity, outcome);
      else await api.restore(confirm.id);
      setPreview(null);
      setConfirm(null);
      load();
    } catch (reason) {
      setError((reason as Error).message);
      setConfirm(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="대시보드"
        description="보유 중인 식재료와 유통기한 현황을 확인해 보세요."
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus />
            식재료 등록
          </Button>
        }
      />

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {loading ? <LoadingBlock /> : null}

      {data ? (
        <>
          <section className={`${cardClass} grid grid-cols-2 overflow-hidden sm:grid-cols-4`}>
            <Stat
              href="/ingredients"
              label="전체"
              value={data.total}
              hint="보유 중"
              valueClass="text-foreground"
              icon={<Package className="size-4" />}
              iconClass="bg-slate-100 text-slate-600"
            />
            <Stat
              href="/ingredients?freshness=FRESH"
              label="정상"
              value={data.fresh}
              hint="4일 이상"
              valueClass="text-brand"
              icon={<CheckCircle2 className="size-4" />}
              iconClass="bg-brand-light text-brand"
            />
            <Stat
              href="/ingredients?freshness=EXPIRING"
              label="임박"
              value={data.expiring}
              hint="3일 이내"
              valueClass="text-amber-700"
              icon={<Clock3 className="size-4" />}
              iconClass="bg-amber-50 text-amber-700"
            />
            <Stat
              href="/ingredients?freshness=EXPIRED"
              label="만료"
              value={data.expired}
              hint="기한 지남"
              valueClass="text-red-600"
              icon={<XCircle className="size-4" />}
              iconClass="bg-red-50 text-red-600"
            />
          </section>

          {data.total === 0 ? (
            <EmptyState
              title="냉장고가 비어 있습니다"
              description="식재료를 등록하면 유통기한 임박·오늘 먹을 것을 바로 확인할 수 있습니다. CSV로 한꺼번에 가져올 수도 있어요."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button type="button" onClick={() => setCreateOpen(true)}>
                    <Plus />
                    식재료 등록
                  </Button>
                  <Button href="/ingredients?create=1" variant="secondary">
                    목록에서 시작
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              {data.unknown > 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] border border-slate-200 bg-slate-50 px-3.5 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] bg-white text-slate-500 shadow-sm">
                    <HelpCircle className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 break-keep">
                    <p className="text-sm font-medium text-foreground">
                      기한 미정{" "}
                      <span className="tabular-nums text-brand">{data.unknown}</span>개
                    </p>
                    <p className="mt-0.5 text-xs leading-5 text-muted">전체 보유 수에 포함됩니다. 날짜를 채우면 알림·임박 관리가 쉬워집니다.</p>
                  </div>
                  <Button href="/ingredients?freshness=UNKNOWN" variant="secondary" size="sm" className="shrink-0">
                    목록 보기
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              ) : null}

              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="p-5 md:p-6">
                  <SectionHeading title="오늘까지" href="/plan?range=today" count={(data.dueToday ?? []).length} icon={<TriangleAlert className="size-4 text-red-600" />} />
                  {(data.dueToday ?? []).length === 0 ? (
                    <p className="mt-5 text-sm font-normal text-muted">오늘까지인 재료가 없습니다.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-slate-100">
                      {(data.dueToday ?? []).map((item) => (
                        <DashboardDueRow
                          key={item.id}
                          item={item}
                          detail={`${formatDate(item.expirationDate)} · ${daysLabel(item.daysLeft)}`}
                          onPreview={() => setPreview(item)}
                          onConsume={() =>
                            setConfirm({ id: item.id, action: "consume", maxQuantity: item.quantity, unit: item.unit, initialOutcome: "USED" })
                          }
                          onWaste={() =>
                            setConfirm({ id: item.id, action: "consume", maxQuantity: item.quantity, unit: item.unit, initialOutcome: "WASTED" })
                          }
                        />
                      ))}
                    </ul>
                  )}
                </Card>
                <Card className="p-5 md:p-6">
                  <SectionHeading title="이번 주" href="/plan?range=week" count={(data.dueWeek ?? []).length} icon={<Clock3 className="size-4 text-amber-600" />} />
                  {(data.dueWeek ?? []).length === 0 ? (
                    <p className="mt-5 text-sm font-normal text-muted">이번 주 안에 먹을 재료가 없습니다.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-slate-100">
                      {(data.dueWeek ?? []).map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setPreview(item)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-3 text-left hover:bg-slate-50 first:pt-1"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium text-slate-800">{item.name}</span>
                              <span className="mt-0.5 block text-sm font-normal text-muted">
                                {quantityLabel(item.quantity, item.unit)} · {daysLabel(item.daysLeft)}
                              </span>
                            </span>
                            <StatusBadge freshness={item.freshness} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>

              <Card className="p-5 md:p-6">
                <SectionHeading
                  title="유통기한 임박"
                  href="/ingredients?freshness=EXPIRING"
                  count={data.expiringItems.length}
                  icon={<TriangleAlert className="size-4 text-amber-600" />}
                />
                {data.expiringItems.length === 0 ? (
                  <p className="mt-5 text-sm font-normal text-muted">임박한 재료가 없습니다.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-slate-100">
                    {data.expiringItems.map((item) => (
                      <DashboardDueRow
                        key={item.id}
                        item={item}
                        detail={`${item.categoryName} · ${quantityLabel(item.quantity, item.unit)} · ${formatDate(item.expirationDate)} · ${daysLabel(item.daysLeft)}`}
                        onPreview={() => setPreview(item)}
                        onConsume={() =>
                          setConfirm({ id: item.id, action: "consume", maxQuantity: item.quantity, unit: item.unit, initialOutcome: "USED" })
                        }
                        onWaste={() =>
                          setConfirm({ id: item.id, action: "consume", maxQuantity: item.quantity, unit: item.unit, initialOutcome: "WASTED" })
                        }
                      />
                    ))}
                  </ul>
                )}
              </Card>

              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="p-5 md:p-6">
                  <SectionHeading
                    title="최근 등록"
                    href="/ingredients"
                    count={data.recentItems.length}
                    icon={<History className="size-4 text-slate-500" />}
                  />
                  {data.recentItems.length === 0 ? (
                    <p className="mt-5 text-sm font-normal text-muted">아직 등록한 식재료가 없습니다.</p>
                  ) : (
                    <ul className="mt-4 divide-y divide-slate-100">
                      {data.recentItems.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setPreview(item)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-3 text-left hover:bg-slate-50 first:pt-1"
                          >
                            <span className="min-w-0">
                              <span className="block font-medium text-slate-800">{item.name}</span>
                              <span className="mt-0.5 block text-sm font-normal text-muted">
                                {item.categoryName} · {formatDate(item.createdAt.slice(0, 10))} 등록
                              </span>
                            </span>
                            <StatusBadge freshness={item.freshness} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <Card className="p-5 md:p-6">
                  <SectionHeading title="카테고리별 재고" icon={<LayoutGrid className="size-4 text-slate-500" />} />
                  <ul className="mt-5 grid gap-3.5">
                    {data.categories.map((category) => (
                      <CategoryMeter key={category.name} name={category.name} count={category.count} total={data.total} />
                    ))}
                  </ul>
                </Card>
              </div>
            </>
          )}
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
            load();
          }}
        />
      ) : null}
      {confirm ? (
        <IngredientActionDialog
          action={confirm.action}
          confirmLabel={
            confirm.action === "consume" ? (confirm.initialOutcome === "WASTED" ? "폐기" : "소비 완료") : undefined
          }
          pending={pending}
          maxQuantity={confirm.maxQuantity}
          unit={confirm.unit}
          initialOutcome={confirm.initialOutcome}
          onClose={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      ) : null}
      <IngredientCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(item) => {
          load();
          setPreview(item);
        }}
      />
    </div>
  );
}

function DashboardDueRow({
  item,
  detail,
  onPreview,
  onConsume,
  onWaste,
}: {
  item: Ingredient;
  detail: string;
  onPreview: () => void;
  onConsume: () => void;
  onWaste: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
      <button type="button" onClick={onPreview} className="min-w-0 flex-1 rounded-lg px-1 py-1 text-left hover:bg-slate-50">
        <span className="block font-medium text-slate-800">{item.name}</span>
        <span className="mt-0.5 block text-sm font-normal text-muted">{detail}</span>
      </button>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        <IngredientActionButton label="소비" onClick={onConsume} />
        <Button type="button" variant="outlineDanger" size="sm" onClick={onWaste}>
          폐기
        </Button>
      </div>
    </li>
  );
}

function SectionHeading({
  title,
  href,
  count,
  icon,
}: {
  title: string;
  href?: string;
  count?: number;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {typeof count === "number" ? <span className="text-sm font-medium tabular-nums text-muted">{count}</span> : null}
      </div>
      {href ? (
        <Link href={href} className={`inline-flex items-center gap-0.5 text-sm ${brandTextLinkClass}`}>
          전체 보기
          <ChevronRight className="size-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function CategoryMeter({ name, count, total }: { name: string; count: number; total: number }) {
  const ratio = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <li className="grid gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{name}</span>
        <span className="font-normal tabular-nums text-muted">
          {count}개 · {ratio}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand" style={{ width: `${ratio}%` }} />
      </div>
    </li>
  );
}

function Stat({
  href,
  label,
  value,
  hint,
  valueClass,
  icon,
  iconClass,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  valueClass: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-border/60 px-4 py-4 transition-colors last:border-b-0 hover:bg-brand-light/40 sm:border-b-0 sm:border-r sm:last:border-r-0 md:gap-4 md:px-5 md:py-5"
    >
      <span className={`grid size-8 shrink-0 place-items-center rounded-[var(--radius-control)] ${iconClass}`}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-xs font-normal leading-4 text-muted">{hint}</p>
      </div>
      <p className={`shrink-0 text-2xl font-bold tabular-nums tracking-tight md:text-3xl ${valueClass}`}>{value}</p>
    </Link>
  );
}
