import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env";
import { ingredientRepository } from "../repositories/ingredient.repository";
import { userRepository } from "../repositories/user.repository";
import type { NotificationSettings, PublicUser, User } from "../types";
import { AppError } from "../utils/errors";

const DUMMY_HASH = bcrypt.hashSync("naengteol-dummy-password", 10);

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  notifyD3: true,
  notifyD0: true,
};

function publicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname?.trim() ?? "",
    createdAt: user.createdAt,
    notificationSettings: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...user.notificationSettings,
    },
  };
}

export function signToken(user: { id: string; email: string; tokenVersion: number }): string {
  const options: SignOptions = { expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"] };
  return jwt.sign({ sub: user.id, email: user.email, ver: user.tokenVersion }, env.jwtSecret, options);
}

export const authService = {
  async signup(email: string, password: string): Promise<User> {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError(409, "이미 가입된 이메일입니다.", [
        { field: "email", message: "이미 가입된 이메일입니다." },
      ]);
    }

    const now = new Date().toISOString();
    const user = await userRepository.create({
      id: randomUUID(),
      email,
      nickname: "",
      password: await bcrypt.hash(password, 10),
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    return user;
  },

  async demoLogin(): Promise<User> {
    if (!env.demoLogin) {
      throw new AppError(404, "데모 로그인을 사용할 수 없습니다.");
    }
    const existing = await userRepository.findByEmail(env.demoEmail);
    if (existing) return existing;

    const now = new Date().toISOString();
    return userRepository.create({
      id: randomUUID(),
      email: env.demoEmail,
      nickname: "",
      password: await bcrypt.hash(randomUUID(), 10),
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
  },

  async login(email: string, password: string): Promise<PublicUser> {
    const user = await userRepository.findByEmail(email);
    const hash = user?.password ?? DUMMY_HASH;
    const matches = await bcrypt.compare(password, hash);
    if (!user || !matches) {
      throw new AppError(401, "이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    return publicUser(user);
  },

  present(user: User): PublicUser {
    return publicUser(user);
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await this.requireUser(userId);
    return publicUser(user);
  },

  async updateNickname(userId: string, nickname: string): Promise<PublicUser> {
    return this.updateProfile(userId, { nickname });
  },

  async updateProfile(
    userId: string,
    patch: { nickname?: string; notificationSettings?: NotificationSettings },
  ): Promise<PublicUser> {
    const user = await this.requireUser(userId);
    const saved = await userRepository.save({
      ...user,
      nickname: patch.nickname ?? user.nickname,
      notificationSettings: patch.notificationSettings
        ? { ...DEFAULT_NOTIFICATION_SETTINGS, ...patch.notificationSettings }
        : user.notificationSettings,
      updatedAt: new Date().toISOString(),
    });
    return publicUser(saved);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<User> {
    const user = await this.requireUser(userId);
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      throw new AppError(400, "현재 비밀번호가 올바르지 않습니다.", [
        { field: "currentPassword", message: "현재 비밀번호가 올바르지 않습니다." },
      ]);
    }
    return userRepository.save({
      ...user,
      password: await bcrypt.hash(newPassword, 10),
      tokenVersion: (user.tokenVersion ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  },

  async requireUser(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(401, "로그인이 필요합니다.");
    }
    return user;
  },

  async revoke(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) return;
    await userRepository.save({
      ...user,
      tokenVersion: (user.tokenVersion ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  },

  async withdraw(userId: string): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(401, "로그인이 필요합니다.");
    }
    await ingredientRepository.deleteByUser(userId);
    await userRepository.deleteById(userId);
  },
};
