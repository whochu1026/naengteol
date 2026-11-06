import type { Request, Response } from "express";
import { ingredientService } from "../services/ingredient.service";
import {
  bulkSchema,
  consumeSchema,
  createIngredientSchema,
  importSchema,
  listIngredientQuerySchema,
  mergeSchema,
  parseInput,
  updateIngredientSchema,
} from "../validators/schemas";

export const ingredientController = {
  async list(req: Request, res: Response) {
    const query = parseInput(listIngredientQuerySchema, req.query);
    const data = await ingredientService.list(req.user!.id, query);
    res.json({ success: true, data });
  },

  async get(req: Request, res: Response) {
    const data = await ingredientService.get(req.user!.id, req.params.id);
    res.json({ success: true, data });
  },

  async create(req: Request, res: Response) {
    const body = parseInput(createIngredientSchema, req.body);
    const data = await ingredientService.create(req.user!.id, body);
    res.status(201).json({ success: true, data });
  },

  async update(req: Request, res: Response) {
    const body = parseInput(updateIngredientSchema, req.body);
    const data = await ingredientService.update(req.user!.id, req.params.id, body);
    res.json({ success: true, data });
  },

  async remove(req: Request, res: Response) {
    await ingredientService.remove(req.user!.id, req.params.id);
    res.json({ success: true, data: { id: req.params.id, deleted: true } });
  },

  async purge(req: Request, res: Response) {
    await ingredientService.purge(req.user!.id, req.params.id);
    res.json({ success: true, data: { id: req.params.id, purged: true } });
  },

  async consume(req: Request, res: Response) {
    const body = parseInput(consumeSchema, req.body ?? {});
    const data = await ingredientService.consume(
      req.user!.id,
      req.params.id,
      body.quantity,
      body.outcome ?? "USED",
    );
    res.json({ success: true, data });
  },

  async restore(req: Request, res: Response) {
    const data = await ingredientService.restore(req.user!.id, req.params.id);
    res.json({ success: true, data });
  },

  async bulk(req: Request, res: Response) {
    const body = parseInput(bulkSchema, req.body);
    const data = await ingredientService.bulk(req.user!.id, body.action, body.ids);
    res.json({ success: true, data });
  },

  async mergeSuggestions(req: Request, res: Response) {
    const data = await ingredientService.mergeSuggestions(req.user!.id);
    res.json({ success: true, data });
  },

  async merge(req: Request, res: Response) {
    const body = parseInput(mergeSchema, req.body);
    const data = await ingredientService.merge(req.user!.id, body.ids);
    res.json({ success: true, data });
  },

  async stats(req: Request, res: Response) {
    const data = await ingredientService.stats(req.user!.id);
    res.json({ success: true, data });
  },

  async quickTemplates(req: Request, res: Response) {
    const data = await ingredientService.quickTemplates(req.user!.id);
    res.json({ success: true, data });
  },

  async alerts(req: Request, res: Response) {
    const data = await ingredientService.alerts(req.user!.id);
    res.json({ success: true, data });
  },

  async exportCsv(req: Request, res: Response) {
    const data = await ingredientService.exportCsv(req.user!.id);
    res.json({ success: true, data });
  },

  async importCsv(req: Request, res: Response) {
    const body = parseInput(importSchema, req.body);
    const data = await ingredientService.importCsv(req.user!.id, body.csv, { dryRun: body.dryRun });
    res.status(201).json({ success: true, data });
  },
};
