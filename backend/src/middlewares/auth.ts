import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../utils/errors";

interface TokenPayload {
  sub: string;
  email: string;
  ver?: number;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[env.cookieName];
  if (!token || typeof token !== "string") {
    next(new AppError(401, "로그인이 필요합니다."));
    return;
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch {
    next(new AppError(401, "로그인이 필요합니다."));
    return;
  }

  if (!payload.sub) {
    next(new AppError(401, "로그인이 필요합니다."));
    return;
  }

  try {
    const user = await userRepository.findById(payload.sub);
    if (!user || (user.tokenVersion ?? 0) !== (payload.ver ?? 0)) {
      next(new AppError(401, "로그인이 필요합니다."));
      return;
    }
    req.user = { id: user.id, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
}
