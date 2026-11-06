import type { Category } from "../types";
import { categoryTable, DEFAULT_CATEGORIES } from "./store";

export const categoryRepository = {
  async list(): Promise<Category[]> {
    const categories = await categoryTable.read();
    const source = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
    return [...source].sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async findById(id: string): Promise<Category | undefined> {
    const categories = await this.list();
    return categories.find((category) => category.id === id);
  },
};
