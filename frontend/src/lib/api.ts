import type { FieldError } from "./types";

export class ApiError extends Error {
  status: number;
  errors: FieldError[];

  constructor(message: string, status: number, errors: FieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.", 0);
  }

  const body = (await response.json().catch(() => null)) as {
    message?: string;
    data?: T;
    errors?: FieldError[];
  } | null;

  if (!response.ok) {
    throw new ApiError(body?.message || "요청을 처리하지 못했습니다.", response.status, body?.errors ?? []);
  }

  return body?.data as T;
}

export const api = {
  signup: (email: string, password: string) =>
    request<import("./types").User>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<import("./types").User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  demoLogin: () => request<import("./types").User>("/api/auth/demo", { method: "POST" }),
  logout: () => request<{ loggedOut: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<import("./types").User>("/api/auth/me"),
  updateNickname: (nickname: string) =>
    request<import("./types").User>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify({ nickname }),
    }),
  updateProfile: (body: {
    nickname?: string;
    notificationSettings?: import("./types").NotificationSettings;
  }) =>
    request<import("./types").User>("/api/auth/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<import("./types").User>("/api/auth/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  withdraw: () => request<{ deleted: boolean }>("/api/auth/me", { method: "DELETE" }),
  categories: () => request<import("./types").Category[]>("/api/categories"),
  dashboard: () => request<import("./types").DashboardSummary>("/api/dashboard"),
  ingredients: (query: URLSearchParams) =>
    request<import("./types").IngredientList>(`/api/ingredients?${query.toString()}`),
  ingredient: (id: string) => request<import("./types").Ingredient>(`/api/ingredients/${id}`),
  createIngredient: (body: import("./types").IngredientInput) =>
    request<import("./types").Ingredient>("/api/ingredients", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateIngredient: (id: string, body: Partial<import("./types").IngredientInput>) =>
    request<import("./types").Ingredient>(`/api/ingredients/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteIngredient: (id: string) =>
    request<{ id: string; deleted: boolean }>(`/api/ingredients/${id}`, { method: "DELETE" }),
  purgeIngredient: (id: string) =>
    request<{ id: string; purged: boolean }>(`/api/ingredients/${id}/purge`, { method: "POST" }),
  consume: (id: string, quantity?: number, outcome: import("./types").ConsumeOutcome = "USED") =>
    request<import("./types").Ingredient>(`/api/ingredients/${id}/consume`, {
      method: "POST",
      body: JSON.stringify({
        ...(quantity === undefined ? {} : { quantity }),
        outcome,
      }),
    }),
  restore: (id: string) =>
    request<import("./types").Ingredient>(`/api/ingredients/${id}/restore`, { method: "POST" }),
  bulkIngredients: (action: "consume" | "waste" | "delete" | "restore" | "purge", ids: string[]) =>
    request<{
      action: string;
      successCount: number;
      failureCount: number;
      results: { id: string; ok: boolean; message?: string }[];
    }>("/api/ingredients/bulk", {
      method: "POST",
      body: JSON.stringify({ action, ids }),
    }),
  mergeSuggestions: () => request<import("./types").MergeSuggestion[]>("/api/ingredients/merge-suggestions"),
  mergeIngredients: (ids: string[]) =>
    request<import("./types").Ingredient>("/api/ingredients/merge", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  ingredientStats: () => request<import("./types").IngredientStats>("/api/ingredients/stats"),
  quickTemplates: () => request<import("./types").QuickTemplate[]>("/api/ingredients/quick-templates"),
  expiryAlerts: () => request<import("./types").ExpiryAlerts>("/api/ingredients/alerts"),
  exportIngredients: () => request<{ csv: string; count: number }>("/api/ingredients/export"),
  importIngredients: (csv: string, options?: { dryRun?: boolean }) =>
    request<{
      dryRun: boolean;
      createdCount: number;
      validCount: number;
      errorCount: number;
      errors: { line: number; message: string }[];
      preview: {
        line: number;
        ok: boolean;
        name: string;
        category: string;
        quantity: string;
        unit: string;
        storageType: string;
        message?: string;
      }[];
      items: import("./types").Ingredient[];
    }>("/api/ingredients/import", {
      method: "POST",
      body: JSON.stringify({ csv, dryRun: options?.dryRun }),
    }),
};

export function fieldMessage(errors: FieldError[] | undefined, field: string) {
  return errors?.find((error) => error.field === field)?.message;
}
