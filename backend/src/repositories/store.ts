import path from "path";
import { env } from "../config/env";
import type { Category, Ingredient, User } from "../types";
import { JsonTable } from "./jsonTable";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat_vegetable", name: "채소", sortOrder: 1 },
  { id: "cat_fruit", name: "과일", sortOrder: 2 },
  { id: "cat_meat", name: "육류", sortOrder: 3 },
  { id: "cat_seafood", name: "해산물", sortOrder: 4 },
  { id: "cat_dairy", name: "유제품", sortOrder: 5 },
  { id: "cat_processed", name: "가공식품", sortOrder: 6 },
  { id: "cat_seasoning", name: "조미료", sortOrder: 7 },
  { id: "cat_etc", name: "기타", sortOrder: 8 },
];

export const userTable = new JsonTable<User>(path.join(env.dataDir, "users.json"));
export const categoryTable = new JsonTable<Category>(path.join(env.dataDir, "categories.json"));
export const ingredientTable = new JsonTable<Ingredient>(path.join(env.dataDir, "ingredients.json"));

export async function ensureDataFiles(): Promise<void> {
  await userTable.ensure();
  await ingredientTable.ensure();
  const categories = await categoryTable.read();
  if (categories.length === 0) {
    await categoryTable.write(DEFAULT_CATEGORIES);
  }
}
