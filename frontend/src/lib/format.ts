import type { ConsumeOutcome, Freshness, IngredientStatus, SortKey, StorageType } from "./types";

export const STORAGE_LABEL: Record<StorageType, string> = {
  REFRIGERATED: "냉장",
  FROZEN: "냉동",
  ROOM: "실온",
};

export const STATUS_LABEL: Record<IngredientStatus, string> = {
  ACTIVE: "보유",
  CONSUMED: "소비 완료",
  DELETED: "휴지통",
};

export const OUTCOME_LABEL: Record<ConsumeOutcome, string> = {
  USED: "먹음",
  WASTED: "폐기",
};

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  FRESH: "정상",
  EXPIRING: "임박",
  EXPIRED: "만료",
  UNKNOWN: "기한 미정",
};

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "expirationDate", label: "유통기한 임박순" },
  { value: "expirationDateDesc", label: "유통기한 늦은 순" },
  { value: "name", label: "이름순" },
  { value: "createdAt", label: "최근 등록순" },
];

export const UNITS = ["개", "g", "kg", "ml", "L", "봉", "팩", "병"];

export function formatDate(value: string | null) {
  if (!value) return "미입력";
  const [year, month, day] = value.split("-");
  return `${year}. ${month}. ${day}`;
}

export function formatQuantity(value: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(value);
}

export function quantityLabel(quantity: number, unit: string) {
  return `${formatQuantity(quantity)}${unit}`;
}

export const PASSWORD_HINT = "8~20자이며 영문과 숫자를 모두 포함해야 합니다.";

export function daysLabel(days: number | null) {
  if (days === null) return "기한 미정";
  if (days === 0) return "오늘까지";
  if (days < 0) return `${Math.abs(days)}일 지남`;
  return `${days}일 남음`;
}
