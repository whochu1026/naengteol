import type { Ingredient } from "../types";
import { ingredientTable } from "./store";

export const ingredientRepository = {
  async listByUser(userId: string): Promise<Ingredient[]> {
    const rows = await ingredientTable.read();
    return rows.filter((row) => row.userId === userId);
  },

  async findById(id: string): Promise<Ingredient | undefined> {
    const rows = await ingredientTable.read();
    return rows.find((row) => row.id === id);
  },

  async create(ingredient: Ingredient): Promise<Ingredient> {
    await ingredientTable.update((rows) => [...rows, ingredient]);
    return ingredient;
  },

  async save(ingredient: Ingredient): Promise<Ingredient> {
    let saved = false;
    await ingredientTable.update((rows) =>
      rows.map((row) => {
        if (row.id !== ingredient.id) return row;
        saved = true;
        return ingredient;
      }),
    );
    if (!saved) {
      throw new Error("저장할 식재료를 찾지 못했습니다.");
    }
    return ingredient;
  },

  async deleteById(id: string): Promise<boolean> {
    let removed = false;
    await ingredientTable.update((rows) =>
      rows.filter((row) => {
        if (row.id !== id) return true;
        removed = true;
        return false;
      }),
    );
    return removed;
  },

  async deleteByUser(userId: string): Promise<void> {
    await ingredientTable.update((rows) => rows.filter((row) => row.userId !== userId));
  },
};
