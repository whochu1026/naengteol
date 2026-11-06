import type { Request, Response } from "express";
import { categoryRepository } from "../repositories/category.repository";

export const categoryController = {
  async list(_req: Request, res: Response) {
    const categories = await categoryRepository.list();
    res.json({ success: true, data: categories });
  },
};
