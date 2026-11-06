import type { CookieOptions, Response } from "express";
import { env } from "../config/env";

const week = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(env.cookieName, token, { ...cookieOptions(), maxAge: week });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(env.cookieName, cookieOptions());
}
