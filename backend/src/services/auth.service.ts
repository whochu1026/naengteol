import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";
import { env } from "../config/env";
import { categoryRepository } from "../repositories/category.repository";
import { ingredientRepository } from "../repositories/ingredient.repository";
import { userRepository } from "../repositories/user.repository";
import type {
  ConsumeOutcome,
  Ingredient,
  IngredientStatus,
  NotificationSettings,
  PublicUser,
  StorageType,
  User,
} from "../types";
import { isDemoEmail } from "../utils/demo";
import { AppError } from "../utils/errors";
import { seoulToday } from "../utils/expiration";

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
    await pruneStaleDemoUsers();

    const id = randomUUID();
    const now = new Date().toISOString();
    const user = await userRepository.create({
      id,
      email: `demo-${id.slice(0, 8)}@naengteol.local`,
      nickname: "데모",
      password: await bcrypt.hash(randomUUID(), 10),
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
    });
    await seedDemoFridge(user.id);
    return user;
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

const DEMO_TTL_MS = 24 * 60 * 60 * 1000;

async function pruneStaleDemoUsers(): Promise<void> {
  const cutoff = Date.now() - DEMO_TTL_MS;
  const users = await userRepository.list();
  for (const user of users) {
    if (!isDemoEmail(user.email)) continue;
    if (Date.parse(user.createdAt) > cutoff) continue;
    await ingredientRepository.deleteByUser(user.id);
    await userRepository.deleteById(user.id);
  }
}

function shiftDate(base: string, days: number): string {
  const [year, month, day] = base.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

async function seedDemoFridge(userId: string): Promise<void> {
  const categories = await categoryRepository.list();
  const byName = new Map(categories.map((category) => [category.name, category.id]));
  const today = seoulToday();
  const now = new Date().toISOString();
  const samples: Array<{
    name: string;
    category: string;
    quantity: number;
    unit: string;
    storageType: StorageType;
    expirationOffset: number | null;
    purchaseOffset?: number;
    status?: IngredientStatus;
    outcome?: ConsumeOutcome | null;
    consumedOffset?: number;
    memo?: string;
  }> = [
    // 보유 · 당일/임박 (먹을 것·알림)
    { name: "시금치", category: "채소", quantity: 1, unit: "봉", storageType: "REFRIGERATED", expirationOffset: 0, memo: "오늘까지" },
    { name: "두부", category: "유제품", quantity: 1, unit: "모", storageType: "REFRIGERATED", expirationOffset: 0 },
    { name: "우유", category: "유제품", quantity: 1, unit: "개", storageType: "REFRIGERATED", expirationOffset: 2 },
    { name: "요거트", category: "유제품", quantity: 4, unit: "개", storageType: "REFRIGERATED", expirationOffset: 3 },
    { name: "닭가슴살", category: "육류", quantity: 2, unit: "팩", storageType: "FROZEN", expirationOffset: 3, memo: "해동 후 조리" },
    // 보유 · 정상
    { name: "계란", category: "기타", quantity: 10, unit: "개", storageType: "REFRIGERATED", expirationOffset: 10 },
    { name: "당근", category: "채소", quantity: 3, unit: "개", storageType: "REFRIGERATED", expirationOffset: 8 },
    { name: "양파", category: "채소", quantity: 5, unit: "개", storageType: "ROOM", expirationOffset: 12 },
    { name: "사과", category: "과일", quantity: 4, unit: "개", storageType: "REFRIGERATED", expirationOffset: 9 },
    { name: "바나나", category: "과일", quantity: 1, unit: "송이", storageType: "ROOM", expirationOffset: 4 },
    { name: "연어", category: "해산물", quantity: 300, unit: "g", storageType: "FROZEN", expirationOffset: 21 },
    { name: "새우", category: "해산물", quantity: 200, unit: "g", storageType: "FROZEN", expirationOffset: 18 },
    { name: "식빵", category: "가공식품", quantity: 1, unit: "봉", storageType: "ROOM", expirationOffset: 5 },
    { name: "참치캔", category: "가공식품", quantity: 3, unit: "개", storageType: "ROOM", expirationOffset: 180 },
    { name: "간장", category: "조미료", quantity: 1, unit: "병", storageType: "ROOM", expirationOffset: 365 },
    { name: "고추장", category: "조미료", quantity: 1, unit: "통", storageType: "REFRIGERATED", expirationOffset: 90 },
    // 보유 · 만료 / 기한 미정
    { name: "상한 상추", category: "채소", quantity: 1, unit: "봉", storageType: "REFRIGERATED", expirationOffset: -2, memo: "폐기 검토" },
    { name: "유통기한 지난 우유", category: "유제품", quantity: 1, unit: "개", storageType: "REFRIGERATED", expirationOffset: -1 },
    { name: "직접 담근 김치", category: "채소", quantity: 1, unit: "통", storageType: "REFRIGERATED", expirationOffset: null, memo: "기한 미정" },
    { name: "남은 잡곡밥", category: "기타", quantity: 2, unit: "인분", storageType: "FROZEN", expirationOffset: null },
    // 소비 이력 · 먹음
    {
      name: "우유",
      category: "유제품",
      quantity: 1,
      unit: "개",
      storageType: "REFRIGERATED",
      expirationOffset: -5,
      status: "CONSUMED",
      outcome: "USED",
      consumedOffset: -1,
      memo: "아침 커피용",
    },
    {
      name: "계란",
      category: "기타",
      quantity: 3,
      unit: "개",
      storageType: "REFRIGERATED",
      expirationOffset: 2,
      status: "CONSUMED",
      outcome: "USED",
      consumedOffset: -2,
    },
    {
      name: "토마토",
      category: "채소",
      quantity: 2,
      unit: "개",
      storageType: "REFRIGERATED",
      expirationOffset: 1,
      status: "CONSUMED",
      outcome: "USED",
      consumedOffset: -3,
    },
    {
      name: "닭다리",
      category: "육류",
      quantity: 400,
      unit: "g",
      storageType: "FROZEN",
      expirationOffset: 20,
      status: "CONSUMED",
      outcome: "USED",
      consumedOffset: -4,
    },
    // 소비 이력 · 폐기
    {
      name: "시금치",
      category: "채소",
      quantity: 1,
      unit: "봉",
      storageType: "REFRIGERATED",
      expirationOffset: -3,
      status: "CONSUMED",
      outcome: "WASTED",
      consumedOffset: -2,
      memo: "물러서 버림",
    },
    {
      name: "요거트",
      category: "유제품",
      quantity: 2,
      unit: "개",
      storageType: "REFRIGERATED",
      expirationOffset: -1,
      status: "CONSUMED",
      outcome: "WASTED",
      consumedOffset: -5,
    },
    {
      name: "식빵",
      category: "가공식품",
      quantity: 0.5,
      unit: "봉",
      storageType: "ROOM",
      expirationOffset: -4,
      status: "CONSUMED",
      outcome: "WASTED",
      consumedOffset: -6,
    },
    // 휴지통
    {
      name: "잘못 등록한 항목",
      category: "기타",
      quantity: 1,
      unit: "개",
      storageType: "ROOM",
      expirationOffset: 30,
      status: "DELETED",
      memo: "휴지통 예시",
    },
    {
      name: "중복 당근",
      category: "채소",
      quantity: 1,
      unit: "개",
      storageType: "REFRIGERATED",
      expirationOffset: 7,
      status: "DELETED",
    },
  ];

  for (const sample of samples) {
    const categoryId = byName.get(sample.category);
    if (!categoryId) continue;
    const status = sample.status ?? "ACTIVE";
    const purchaseOffset = sample.purchaseOffset ?? -5;
    const ingredient: Ingredient = {
      id: randomUUID(),
      userId,
      categoryId,
      name: sample.name,
      quantity: sample.quantity,
      unit: sample.unit,
      purchasedAt: shiftDate(today, purchaseOffset),
      expirationDate: sample.expirationOffset === null ? null : shiftDate(today, sample.expirationOffset),
      storageType: sample.storageType,
      status,
      memo: sample.memo ?? "데모 샘플",
      consumedAt: status === "CONSUMED" ? shiftDate(today, sample.consumedOffset ?? -1) : null,
      outcome: status === "CONSUMED" ? (sample.outcome ?? "USED") : null,
      createdAt: now,
      updatedAt: now,
    };
    await ingredientRepository.create(ingredient);
  }
}
