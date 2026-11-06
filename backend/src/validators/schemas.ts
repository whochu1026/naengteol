import { z } from "zod";
import type { FieldError } from "../types";
import { AppError } from "../utils/errors";
import { isRealDate } from "../utils/expiration";

const dateField = z.preprocess(
  (value) => (value === "" ? null : value),
  z
    .string()
    .nullable()
    .optional()
    .refine((value) => value == null || isRealDate(value), "올바른 날짜를 입력해 주세요."),
) as z.ZodType<string | null | undefined>;

export const signupSchema = z.object({
  email: z
    .string({ required_error: "이메일을 입력해 주세요." })
    .trim()
    .min(1, "이메일을 입력해 주세요.")
    .max(255)
    .email("이메일 형식이 올바르지 않습니다.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string({ required_error: "비밀번호를 입력해 주세요." })
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .max(20, "비밀번호는 20자 이하여야 합니다.")
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "비밀번호는 영문과 숫자를 모두 포함해야 합니다."),
});

export const nicknameSchema = z.object({
  nickname: z
    .string({ required_error: "닉네임을 입력해 주세요." })
    .trim()
    .min(1, "닉네임을 입력해 주세요.")
    .max(20, "닉네임은 20자 이하여야 합니다."),
});

export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  notifyD3: z.boolean(),
  notifyD0: z.boolean(),
});

export const profileSchema = z
  .object({
    nickname: z
      .string()
      .trim()
      .min(1, "닉네임을 입력해 주세요.")
      .max(20, "닉네임은 20자 이하여야 합니다.")
      .optional(),
    notificationSettings: notificationSettingsSchema.optional(),
  })
  .refine((value) => value.nickname !== undefined || value.notificationSettings !== undefined, {
    message: "변경할 내용이 없습니다.",
  });

export const passwordChangeSchema = z.object({
  currentPassword: z
    .string({ required_error: "현재 비밀번호를 입력해 주세요." })
    .min(1, "현재 비밀번호를 입력해 주세요."),
  newPassword: z
    .string({ required_error: "새 비밀번호를 입력해 주세요." })
    .min(8, "비밀번호는 8자 이상이어야 합니다.")
    .max(20, "비밀번호는 20자 이하여야 합니다.")
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "비밀번호는 영문과 숫자를 모두 포함해야 합니다."),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "이메일을 입력해 주세요." })
    .trim()
    .min(1, "이메일을 입력해 주세요.")
    .email("이메일 형식이 올바르지 않습니다.")
    .transform((value) => value.toLowerCase()),
  password: z.string({ required_error: "비밀번호를 입력해 주세요." }).min(1, "비밀번호를 입력해 주세요."),
});

const ingredientFields = {
  name: z
    .string({ required_error: "식재료명을 입력해 주세요." })
    .trim()
    .min(1, "식재료명을 입력해 주세요.")
    .max(100, "식재료명은 100자 이하여야 합니다."),
  categoryId: z.string({ required_error: "카테고리를 선택해 주세요." }).trim().min(1, "카테고리를 선택해 주세요."),
  quantity: z.coerce
    .number({ invalid_type_error: "수량을 숫자로 입력해 주세요." })
    .positive("수량은 0보다 커야 합니다.")
    .max(999999.99, "수량이 너무 큽니다."),
  unit: z
    .string({ required_error: "단위를 입력해 주세요." })
    .trim()
    .min(1, "단위를 입력해 주세요.")
    .max(20, "단위는 20자 이하여야 합니다."),
  purchasedAt: dateField,
  expirationDate: dateField,
  storageType: z.enum(["REFRIGERATED", "FROZEN", "ROOM"], {
    errorMap: () => ({ message: "보관 장소를 선택해 주세요." }),
  }),
  memo: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z
      .string()
      .max(500, "메모는 500자 이하여야 합니다.")
      .nullable()
      .optional()
      .transform((value) => (value === "" ? null : value)),
  ) as z.ZodType<string | null | undefined>,
};

function assertDateOrder(
  value: { purchasedAt?: string | null; expirationDate?: string | null },
  ctx: z.RefinementCtx,
) {
  if (value.purchasedAt && value.expirationDate && value.expirationDate < value.purchasedAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expirationDate"],
      message: "유통기한은 구매일보다 빠를 수 없습니다.",
    });
  }
}

export const createIngredientSchema = z.object(ingredientFields).superRefine(assertDateOrder);

export const updateIngredientSchema = z
  .object({
    name: ingredientFields.name.optional(),
    categoryId: ingredientFields.categoryId.optional(),
    quantity: ingredientFields.quantity.optional(),
    unit: ingredientFields.unit.optional(),
    purchasedAt: dateField.optional(),
    expirationDate: dateField.optional(),
    storageType: ingredientFields.storageType.optional(),
    memo: ingredientFields.memo.optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "변경할 내용이 없습니다.",
  });

const emptyToUndefined = (value: unknown) => (value === "" || value === undefined ? undefined : value);

export const listIngredientQuerySchema = z.object({
  keyword: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()) as z.ZodType<string | undefined>,
  categoryId: z.preprocess(emptyToUndefined, z.string().trim().optional()) as z.ZodType<string | undefined>,
  storageType: z.preprocess(emptyToUndefined, z.enum(["REFRIGERATED", "FROZEN", "ROOM"]).optional()) as z.ZodType<
    "REFRIGERATED" | "FROZEN" | "ROOM" | undefined
  >,
  status: z.preprocess(emptyToUndefined, z.enum(["ACTIVE", "CONSUMED", "DELETED", "ALL"]).optional()) as z.ZodType<
    "ACTIVE" | "CONSUMED" | "DELETED" | "ALL" | undefined
  >,
  freshness: z.preprocess(emptyToUndefined, z.enum(["FRESH", "EXPIRING", "EXPIRED", "UNKNOWN"]).optional()) as z.ZodType<
    "FRESH" | "EXPIRING" | "EXPIRED" | "UNKNOWN" | undefined
  >,
  dueWithin: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(30).optional()) as z.ZodType<
    number | undefined
  >,
  sort: z.preprocess(
    emptyToUndefined,
    z.enum(["expirationDate", "expirationDateDesc", "name", "createdAt"]).optional(),
  ) as z.ZodType<"expirationDate" | "expirationDateDesc" | "name" | "createdAt" | undefined>,
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).optional()) as z.ZodType<number | undefined>,
  limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).optional()) as z.ZodType<
    number | undefined
  >,
});

export const consumeSchema = z.object({
  quantity: z.coerce
    .number({ invalid_type_error: "수량을 숫자로 입력해 주세요." })
    .positive("수량은 0보다 커야 합니다.")
    .max(999999.99, "수량이 너무 큽니다.")
    .optional(),
  outcome: z.enum(["USED", "WASTED"]).optional(),
});

export const bulkSchema = z.object({
  action: z.enum(["consume", "waste", "delete", "restore", "purge"]),
  ids: z.array(z.string().min(1)).min(1, "식재료를 선택해 주세요.").max(100),
});

export const mergeSchema = z.object({
  ids: z.array(z.string().min(1)).min(2, "합칠 식재료를 2개 이상 선택해 주세요.").max(20),
});

export const importSchema = z.object({
  csv: z.string({ required_error: "CSV 내용을 입력해 주세요." }).min(1, "CSV 내용을 입력해 주세요.").max(500_000),
});

export function parseInput<T>(schema: z.ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (result.success) return result.data;
  const errors: FieldError[] = result.error.issues.map((issue) => ({
    field: issue.path.join(".") || "body",
    message: issue.message,
  }));
  throw new AppError(400, "입력값을 확인해 주세요.", errors);
}
