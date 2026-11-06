import { Router } from "express";
import { categoryController } from "../controllers/category.controller";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const categoryRouter = Router();

categoryRouter.use(requireAuth);
categoryRouter.get("/", asyncHandler(categoryController.list));
