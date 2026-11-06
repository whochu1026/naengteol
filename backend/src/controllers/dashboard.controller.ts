import type { Request, Response } from "express";
import { ingredientService } from "../services/ingredient.service";

export const dashboardController = {
  async summary(req: Request, res: Response) {
    const data = await ingredientService.summary(req.user!.id);
    res.json({ success: true, data });
  },
};
