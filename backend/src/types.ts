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
  nickname?: string;
  password: string;
  tokenVersion: number;
  notificationSettings?: NotificationSettings;
  createdAt: string;
  updatedAt: string;
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
  name: string;
  quantity: number;
  unit: string;
  purchasedAt: string | null;
  expirationDate: string | null;
  storageType: StorageType;
  status: IngredientStatus;
  memo: string | null;
  consumedAt?: string | null;
  outcome?: ConsumeOutcome | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  notificationSettings: NotificationSettings;
}

export interface IngredientDto extends Ingredient {
  categoryName: string;
  freshness: Freshness;
  daysLeft: number | null;
}

export interface FieldError {
  field: string;
  message: string;
}
