import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { authService, signToken } from "../services/auth.service";
import { clearAuthCookie, setAuthCookie } from "../utils/cookies";
import { loginSchema, parseInput, passwordChangeSchema, profileSchema, signupSchema } from "../validators/schemas";

export const authController = {
  async signup(req: Request, res: Response) {
    const body = parseInput(signupSchema, req.body);
    const user = await authService.signup(body.email, body.password);
    setAuthCookie(res, signToken(user));
    res.status(201).json({ success: true, data: authService.present(user) });
  },

  async demoLogin(_req: Request, res: Response) {
    const user = await authService.demoLogin();
    setAuthCookie(res, signToken(user));
    res.json({ success: true, data: authService.present(user) });
  },

  async login(req: Request, res: Response) {
    const body = parseInput(loginSchema, req.body);
    const session = await authService.login(body.email, body.password);
    const user = await authService.requireUser(session.id);
    setAuthCookie(res, signToken(user));
    res.json({ success: true, data: session });
  },

  async logout(req: Request, res: Response) {
    const token = req.cookies?.[env.cookieName];
    if (typeof token === "string") {
      try {
        const payload = jwt.verify(token, env.jwtSecret) as { sub?: string };
        if (payload.sub) await authService.revoke(payload.sub);
      } catch {
        // 이미 만료된 토큰이어도 쿠키는 제거한다.
      }
    }
    clearAuthCookie(res);
    res.json({ success: true, data: { loggedOut: true } });
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(req.user!.id);
    res.json({ success: true, data: user });
  },

  async updateNickname(req: Request, res: Response) {
    const body = parseInput(profileSchema, req.body);
    const user = await authService.updateProfile(req.user!.id, body);
    res.json({ success: true, data: user });
  },

  async changePassword(req: Request, res: Response) {
    const body = parseInput(passwordChangeSchema, req.body);
    const user = await authService.changePassword(req.user!.id, body.currentPassword, body.newPassword);
    setAuthCookie(res, signToken(user));
    res.json({ success: true, data: authService.present(user) });
  },

  async withdraw(req: Request, res: Response) {
    await authService.withdraw(req.user!.id);
    clearAuthCookie(res);
    res.json({ success: true, data: { deleted: true } });
  },
};
