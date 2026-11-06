import { STORAGE_LABEL } from "@/lib/format";
import type { FreshnessCounts, OutcomeCounts, SortKey, StorageType } from "@/lib/types";
import { Button, Select } from "@/components/ui";
import { cn } from "@/lib/utils";

function CountTabs({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={label}>
      {tabs.map((tab) => {
        const selected = value === tab.value;
        return (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200",
              selected
                ? "border-brand bg-brand-light text-brand shadow-sm"
                : "border-border bg-surface text-muted hover:border-brand/40 hover:bg-brand-light/50 hover:text-foreground",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                  selected ? "bg-brand/15 text-brand" : "bg-slate-100 text-slate-500",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

const ACTIVE_SORT_CHIPS: { value: SortKey; label: string }[] = [
  { value: "expirationDate", label: "임박순" },
  { value: "expirationDateDesc", label: "늦은 순" },
  { value: "name", label: "이름순" },
  { value: "createdAt", label: "최근 등록" },
];

const CONSUMED_SORT_CHIPS: { value: SortKey; label: string }[] = [
  { value: "consumedAt", label: "최근 소비" },
  { value: "name", label: "이름순" },
  { value: "createdAt", label: "최근 등록" },
];

const OUTCOME_TABS = [
  { value: "", label: "전체", countKey: "total" as const },
  { value: "USED", label: "먹음", countKey: "used" as const },
  { value: "WASTED", label: "폐기", countKey: "wasted" as const },
];

const PERIOD_CHIPS = [
  { value: "", label: "전체" },
  { value: "0", label: "오늘" },
  { value: "7", label: "7일" },
  { value: "30", label: "30일" },
];

const FRESHNESS_TABS = [
  { value: "", label: "전체", countKey: "total" as const },
  { value: "FRESH", label: "정상", countKey: "fresh" as const },
  { value: "EXPIRING", label: "임박", countKey: "expiring" as const },
  { value: "EXPIRED", label: "만료", countKey: "expired" as const },
  { value: "UNKNOWN", label: "기한 미정", countKey: "unknown" as const },
];

export function FreshnessTabs({
  value,
  counts,
  onChange,
}: {
  value: string;
  counts?: FreshnessCounts | null;
  onChange: (value: string) => void;
}) {
  return (
    <CountTabs
      label="유통기한"
      value={value}
      onChange={onChange}
      tabs={FRESHNESS_TABS.map((tab) => ({
        value: tab.value,
        label: tab.label,
        count: counts?.[tab.countKey],
      }))}
    />
  );
}

export function FilterSelect({
  label,
  value,
  selected = false,
  className = "",
  options,
  onChange,
}: {
  label: string;
  value: string;
  selected?: boolean;
  className?: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <Select variant="filter" selected={selected} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={`${label}-${option.value || "all"}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

function OptionChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0" role="radiogroup" aria-label={label}>
      <p className="mb-1.5 text-xs font-medium text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Button
              key={option.value || "all"}
              type="button"
              variant="chip"
              selected={selected}
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function SortRadios({
  value,
  onChange,
  mode = "active",
}: {
  value: SortKey;
  onChange: (value: SortKey) => void;
  mode?: "active" | "consumed";
}) {
  const chips = mode === "consumed" ? CONSUMED_SORT_CHIPS : ACTIVE_SORT_CHIPS;
  return <OptionChips label="정렬" value={value} options={chips} onChange={(next) => onChange(next as SortKey)} />;
}

export function OutcomeTabs({
  value,
  counts,
  onChange,
}: {
  value: string;
  counts?: OutcomeCounts | null;
  onChange: (value: string) => void;
}) {
  return (
    <CountTabs
      label="소비 결과"
      value={value}
      onChange={onChange}
      tabs={OUTCOME_TABS.map((tab) => ({
        value: tab.value,
        label: tab.label,
        count: counts?.[tab.countKey],
      }))}
    />
  );
}

export function ConsumedPeriodChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <OptionChips label="기간" value={value} options={PERIOD_CHIPS} onChange={onChange} />;
}

export function StorageChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const chips = [{ value: "", label: "전체" }, ...(Object.entries(STORAGE_LABEL) as [StorageType, string][]).map(([chipValue, label]) => ({ value: chipValue, label }))];
  return <OptionChips label="보관 장소" value={value} options={chips} onChange={onChange} />;
}
