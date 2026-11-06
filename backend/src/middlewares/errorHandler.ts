import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.errors ?? [],
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      success: false,
      message: "요청 본문 형식이 올바르지 않습니다.",
      errors: [],
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    success: false,
    message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    errors: [],
  });
}
