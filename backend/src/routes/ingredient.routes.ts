import { Router } from "express";
import { ingredientController } from "../controllers/ingredient.controller";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../utils/asyncHandler";

export const ingredientRouter = Router();

ingredientRouter.use(requireAuth);
ingredientRouter.get("/", asyncHandler(ingredientController.list));
ingredientRouter.post("/", asyncHandler(ingredientController.create));
ingredientRouter.get("/stats", asyncHandler(ingredientController.stats));
ingredientRouter.get("/quick-templates", asyncHandler(ingredientController.quickTemplates));
ingredientRouter.get("/alerts", asyncHandler(ingredientController.alerts));
ingredientRouter.get("/export", asyncHandler(ingredientController.exportCsv));
ingredientRouter.post("/import", asyncHandler(ingredientController.importCsv));
ingredientRouter.get("/merge-suggestions", asyncHandler(ingredientController.mergeSuggestions));
ingredientRouter.post("/merge", asyncHandler(ingredientController.merge));
ingredientRouter.post("/bulk", asyncHandler(ingredientController.bulk));
ingredientRouter.get("/:id", asyncHandler(ingredientController.get));
ingredientRouter.patch("/:id", asyncHandler(ingredientController.update));
ingredientRouter.delete("/:id", asyncHandler(ingredientController.remove));
ingredientRouter.post("/:id/consume", asyncHandler(ingredientController.consume));
ingredientRouter.post("/:id/restore", asyncHandler(ingredientController.restore));
ingredientRouter.post("/:id/purge", asyncHandler(ingredientController.purge));
