export type StorageType = "REFRIGERATED" | "FROZEN" | "ROOM";
export type IngredientStatus = "ACTIVE" | "CONSUMED" | "DELETED";
export type ConsumeOutcome = "USED" | "WASTED";
export type Freshness = "FRESH" | "EXPIRING" | "EXPIRED" | "UNKNOWN";
export type SortKey = "expirationDate" | "expirationDateDesc" | "name" | "createdAt";

export interface NotificationSettings {
  enabled: boolean;
  notifyD3: boolean;
  notifyD0: boolean;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  notificationSettings: NotificationSettings;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Ingredient {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  name: string;
  quantity: number;
  unit: string;
  purchasedAt: string | null;
  expirationDate: string | null;
  storageType: StorageType;
  status: IngredientStatus;
  memo: string | null;
  consumedAt: string | null;
  outcome: ConsumeOutcome | null;
  freshness: Freshness;
  daysLeft: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuickTemplate {
  name: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  storageType: StorageType;
  quantity: number;
  count: number;
  lastUsedAt: string;
}

export interface ExpiryAlerts {
  settings: NotificationSettings;
  d3: Ingredient[];
  d0: Ingredient[];
  today: string;
}

export interface IngredientInput {
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  purchasedAt: string | null;
  expirationDate: string | null;
  storageType: StorageType;
  memo: string | null;
}

export interface FreshnessCounts {
  total: number;
  fresh: number;
  expiring: number;
  expired: number;
  unknown: number;
}

export interface IngredientList {
  items: Ingredient[];
  counts: FreshnessCounts;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardSummary {
  total: number;
  fresh: number;
  expiring: number;
  expired: number;
  unknown: number;
  expiringItems: Ingredient[];
  recentItems: Ingredient[];
  dueToday: Ingredient[];
  dueWeek: Ingredient[];
  categories: { name: string; count: number }[];
}

export interface IngredientStats {
  active: number;
  consumed: number;
  used: number;
  wasted: number;
  deleted: number;
  savedRate: number | null;
  expiredActive: number;
  dueSoon: number;
  byCategory: {
    name: string;
    active: number;
    consumed: number;
    used: number;
    wasted: number;
    deleted: number;
  }[];
  recentConsumed: Ingredient[];
}

export interface MergeSuggestion {
  key: string;
  name: string;
  unit: string;
  categoryName: string;
  storageType: StorageType;
  totalQuantity: number;
  items: Ingredient[];
}

export interface FieldError {
  field: string;
  message: string;
}
