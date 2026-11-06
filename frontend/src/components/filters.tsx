import { STORAGE_LABEL } from "@/lib/format";
import type { FreshnessCounts, SortKey, StorageType } from "@/lib/types";
import { Button, Select } from "@/components/ui";

const SORT_CHIPS: { value: SortKey; label: string }[] = [
  { value: "expirationDate", label: "임박순" },
  { value: "expirationDateDesc", label: "늦은 순" },
  { value: "name", label: "이름순" },
  { value: "createdAt", label: "최근 등록" },
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
    <div className="-mx-1 overflow-x-auto border-b border-slate-200" role="tablist" aria-label="유통기한">
      <div className="flex min-w-max gap-1 px-1">
        {FRESHNESS_TABS.map((tab) => {
          const selected = value === tab.value;
          const count = counts?.[tab.countKey];
          return (
            <Button key={tab.label} variant="tab" selected={selected} role="tab" aria-selected={selected} onClick={() => onChange(tab.value)}>
              {tab.label}
              {typeof count === "number" ? <span className="tabular-nums text-current/60">{count}</span> : null}
            </Button>
          );
        })}
      </div>
    </div>
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2" role="radiogroup" aria-label={label}>
      <span className="text-xs font-medium text-slate-500">{label}</span>
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

export function SortRadios({ value, onChange }: { value: SortKey; onChange: (value: SortKey) => void }) {
  return <OptionChips label="정렬" value={value} options={SORT_CHIPS} onChange={(next) => onChange(next as SortKey)} />;
}

export function StorageChips({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const chips = [{ value: "", label: "전체" }, ...(Object.entries(STORAGE_LABEL) as [StorageType, string][]).map(([chipValue, label]) => ({ value: chipValue, label }))];
  return <OptionChips label="보관 장소" value={value} options={chips} onChange={onChange} />;
}
