import assert from "node:assert/strict";
import { mkdtemp, rm } from "fs/promises";
import type { AddressInfo } from "net";
import { tmpdir } from "os";
import path from "path";
import test from "node:test";
import { seoulToday } from "./utils/expiration";

function addDays(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

interface CallResult {
  status: number;
  body: {
    success: boolean;
    message?: string;
    data?: any;
    errors?: { field: string; message: string }[];
  };
  cookie?: string;
}

async function call(
  port: number,
  pathname: string,
  options: { method?: string; body?: unknown; cookie?: string } = {},
): Promise<CallResult> {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.cookie ? { cookie: options.cookie } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  const cookie = cookies.map((value) => value.split(";")[0]).find((value) => value.startsWith("naengteol_token="));
  const body = (await response.json()) as CallResult["body"];
  return { status: response.status, body, cookie };
}

test("냉털 MVP 흐름", async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "naengteol-"));
  process.env.DATA_DIR = dataDir;
  process.env.JWT_SECRET = "test-secret";
  process.env.FRONTEND_ORIGIN = "http://localhost:3000";
  process.env.DEMO_LOGIN = "true";

  const { app } = await import("./app");
  const { ensureDataFiles } = await import("./repositories/store");
  await ensureDataFiles();
  const server = app.listen(0);
  const port = (server.address() as AddressInfo).port;
  t.after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await rm(dataDir, { recursive: true, force: true });
  });

  const today = seoulToday();
  const health = await call(port, "/api/health");
  assert.equal(health.status, 200);

  const anonymous = await call(port, "/api/auth/me");
  assert.equal(anonymous.status, 401);

  const badLogin = await call(port, "/api/auth/login", {
    method: "POST",
    body: { email: "missing@example.com", password: "password1234" },
  });
  assert.equal(badLogin.status, 401);
  assert.equal(badLogin.body.message, "이메일 또는 비밀번호가 올바르지 않습니다.");

  const shortPassword = await call(port, "/api/auth/signup", {
    method: "POST",
    body: { email: "short@example.com", password: "short" },
  });
  assert.equal(shortPassword.status, 400);

  const demo = await call(port, "/api/auth/demo", { method: "POST" });
  assert.equal(demo.status, 200);
  assert.match(demo.body.data.email, /^demo-[a-z0-9]+@naengteol\.local$/i);
  assert.ok(demo.cookie);
  const demoB = await call(port, "/api/auth/demo", { method: "POST" });
  assert.equal(demoB.status, 200);
  assert.notEqual(demo.body.data.email, demoB.body.data.email);

  const signup = await call(port, "/api/auth/signup", {
    method: "POST",
    body: { email: "Cook@Example.com", password: "password1234" },
  });
  assert.equal(signup.status, 201);
  assert.equal(signup.body.data.email, "cook@example.com");
  assert.equal("password" in signup.body.data, false);
  assert.ok(signup.cookie);
  let cookieA = signup.cookie!;

  const duplicate = await call(port, "/api/auth/signup", {
    method: "POST",
    body: { email: "cook@example.com", password: "password1234" },
  });
  assert.equal(duplicate.status, 409);

  const me = await call(port, "/api/auth/me", { cookie: cookieA });
  assert.equal(me.status, 200);
  assert.equal(me.body.data.email, "cook@example.com");
  assert.equal(me.body.data.nickname, "");

  const renamed = await call(port, "/api/auth/me", {
    method: "PATCH",
    cookie: cookieA,
    body: { nickname: "요리사" },
  });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.data.nickname, "요리사");

  const wrongPassword = await call(port, "/api/auth/password", {
    method: "PATCH",
    cookie: cookieA,
    body: { currentPassword: "nope1234", newPassword: "newpass1234" },
  });
  assert.equal(wrongPassword.status, 400);

  const changedPassword = await call(port, "/api/auth/password", {
    method: "PATCH",
    cookie: cookieA,
    body: { currentPassword: "password1234", newPassword: "password5678" },
  });
  assert.equal(changedPassword.status, 200);
  const oldCookieAfterPassword = await call(port, "/api/auth/me", { cookie: cookieA });
  assert.equal(oldCookieAfterPassword.status, 401);
  const loginNewPassword = await call(port, "/api/auth/login", {
    method: "POST",
    body: { email: "cook@example.com", password: "password5678" },
  });
  assert.equal(loginNewPassword.status, 200);
  cookieA = loginNewPassword.cookie!;
  // 이후 테스트에서 다시 쓰기 쉽게 원래 비밀번호로 되돌린다.
  const revertPassword = await call(port, "/api/auth/password", {
    method: "PATCH",
    cookie: cookieA,
    body: { currentPassword: "password5678", newPassword: "password1234" },
  });
  assert.equal(revertPassword.status, 200);
  cookieA = revertPassword.cookie!;

  const categories = await call(port, "/api/categories", { cookie: cookieA });
  assert.equal(categories.status, 200);
  assert.equal(categories.body.data.length, 8);
  const dairyId = categories.body.data.find((category: { name: string }) => category.name === "유제품").id as string;

  const invalidQuantity = await call(port, "/api/ingredients", {
    method: "POST",
    cookie: cookieA,
    body: {
      name: "우유",
      categoryId: dairyId,
      quantity: 0,
      unit: "개",
      storageType: "REFRIGERATED",
    },
  });
  assert.equal(invalidQuantity.status, 400);

  const invalidDate = await call(port, "/api/ingredients", {
    method: "POST",
    cookie: cookieA,
    body: {
      name: "우유",
      categoryId: dairyId,
      quantity: 1,
      unit: "개",
      purchasedAt: today,
      expirationDate: addDays(today, -1),
      storageType: "REFRIGERATED",
    },
  });
  assert.equal(invalidDate.status, 400);

  async function createIngredient(name: string, expirationDate: string | null) {
    const created = await call(port, "/api/ingredients", {
      method: "POST",
      cookie: cookieA,
      body: {
        name,
        categoryId: dairyId,
        quantity: 1.5,
        unit: "개",
        purchasedAt: addDays(today, -2),
        expirationDate,
        storageType: "REFRIGERATED",
        memo: "  저지방  ",
      },
    });
    assert.equal(created.status, 201, created.body.message);
    return created.body.data;
  }

  const expired = await createIngredient("어제 우유", addDays(today, -1));
  const expiring = await createIngredient("오늘 우유", today);
  const fresh = await createIngredient("여유 있는 우유", addDays(today, 4));
  const unknown = await createIngredient("기한 없는 우유", null);
  assert.equal(expired.freshness, "EXPIRED");
  assert.equal(expiring.freshness, "EXPIRING");
  assert.equal(fresh.freshness, "FRESH");
  assert.equal(unknown.freshness, "UNKNOWN");
  assert.equal(expiring.memo, "저지방");

  const dashboard = await call(port, "/api/dashboard", { cookie: cookieA });
  assert.deepEqual(
    {
      total: dashboard.body.data.total,
      fresh: dashboard.body.data.fresh,
      expiring: dashboard.body.data.expiring,
      expired: dashboard.body.data.expired,
      unknown: dashboard.body.data.unknown,
    },
    { total: 4, fresh: 1, expiring: 1, expired: 1, unknown: 1 },
  );
  assert.equal(dashboard.body.data.expiringItems.length, 1);
  assert.equal(dashboard.body.data.expiringItems[0].id, expiring.id);

  const search = await call(port, "/api/ingredients?keyword=여유&status=ACTIVE", { cookie: cookieA });
  assert.equal(search.body.data.pagination.total, 1);
  assert.equal(search.body.data.items[0].id, fresh.id);
  assert.deepEqual(search.body.data.counts, { total: 1, fresh: 1, expiring: 0, expired: 0, unknown: 0 });

  const freshnessFiltered = await call(port, "/api/ingredients?status=ACTIVE&freshness=EXPIRED", { cookie: cookieA });
  assert.equal(freshnessFiltered.body.data.pagination.total, 1);
  assert.deepEqual(freshnessFiltered.body.data.counts, { total: 4, fresh: 1, expiring: 1, expired: 1, unknown: 1 });

  const signupB = await call(port, "/api/auth/signup", {
    method: "POST",
    body: { email: "other@example.com", password: "password1234" },
  });
  const cookieB = signupB.cookie!;
  const hidden = await call(port, `/api/ingredients/${expiring.id}`, { cookie: cookieB });
  assert.equal(hidden.status, 404);
  const foreignList = await call(port, "/api/ingredients", { cookie: cookieB });
  assert.equal(foreignList.body.data.pagination.total, 0);

  const patched = await call(port, `/api/ingredients/${expiring.id}`, {
    method: "PATCH",
    cookie: cookieA,
    body: { quantity: 2, memo: "오늘 먹을 우유" },
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.data.quantity, 2);
  assert.equal(patched.body.data.memo, "오늘 먹을 우유");

  const consumed = await call(port, `/api/ingredients/${fresh.id}/consume`, {
    method: "POST",
    cookie: cookieA,
    body: { outcome: "USED" },
  });
  assert.equal(consumed.status, 200);
  assert.equal(consumed.body.data.status, "CONSUMED");
  assert.equal(consumed.body.data.outcome, "USED");
  assert.match(consumed.body.data.consumedAt, /^\d{4}-\d{2}-\d{2}$/);

  const activeList = await call(port, "/api/ingredients?status=ACTIVE", { cookie: cookieA });
  assert.equal(
    activeList.body.data.items.some((item: { id: string }) => item.id === fresh.id),
    false,
  );
  const consumedList = await call(port, "/api/ingredients?status=CONSUMED", { cookie: cookieA });
  assert.equal(consumedList.body.data.items[0].id, fresh.id);

  const restored = await call(port, `/api/ingredients/${fresh.id}/restore`, {
    method: "POST",
    cookie: cookieA,
  });
  assert.equal(restored.body.data.status, "ACTIVE");
  assert.equal(restored.body.data.outcome, null);

  const wasted = await call(port, `/api/ingredients/${fresh.id}/consume`, {
    method: "POST",
    cookie: cookieA,
    body: { outcome: "WASTED" },
  });
  assert.equal(wasted.status, 200);
  assert.equal(wasted.body.data.outcome, "WASTED");
  const restoredAgain = await call(port, `/api/ingredients/${fresh.id}/restore`, {
    method: "POST",
    cookie: cookieA,
  });
  assert.equal(restoredAgain.body.data.status, "ACTIVE");

  const partial = await call(port, `/api/ingredients/${fresh.id}/consume`, {
    method: "POST",
    cookie: cookieA,
    body: { quantity: 0.5, outcome: "USED" },
  });
  assert.equal(partial.status, 200);
  assert.equal(partial.body.data.status, "ACTIVE");
  assert.equal(partial.body.data.quantity, 1);

  const twin = await call(port, "/api/ingredients", {
    method: "POST",
    cookie: cookieA,
    body: {
      name: fresh.name,
      categoryId: dairyId,
      quantity: 1,
      unit: "개",
      storageType: "REFRIGERATED",
      expirationDate: addDays(today, 5),
    },
  });
  assert.equal(twin.status, 201);
  const suggestions = await call(port, "/api/ingredients/merge-suggestions", { cookie: cookieA });
  assert.equal(suggestions.status, 200);
  assert.ok(suggestions.body.data.some((group: { name: string }) => group.name === fresh.name));
  const merged = await call(port, "/api/ingredients/merge", {
    method: "POST",
    cookie: cookieA,
    body: { ids: [fresh.id, twin.body.data.id] },
  });
  assert.equal(merged.status, 200);
  assert.equal(merged.body.data.quantity, 2);

  const bulk = await call(port, "/api/ingredients/bulk", {
    method: "POST",
    cookie: cookieA,
    body: { action: "consume", ids: [merged.body.data.id] },
  });
  assert.equal(bulk.status, 200);
  assert.equal(bulk.body.data.successCount, 1);

  const stats = await call(port, "/api/ingredients/stats", { cookie: cookieA });
  assert.equal(stats.status, 200);
  assert.ok(stats.body.data.used + stats.body.data.wasted >= 1);
  assert.ok(stats.body.data.savedRate === null || typeof stats.body.data.savedRate === "number");

  const alerts = await call(port, "/api/ingredients/alerts", { cookie: cookieA });
  assert.equal(alerts.status, 200);
  assert.ok(Array.isArray(alerts.body.data.d0));
  assert.ok(Array.isArray(alerts.body.data.d3));

  const exported = await call(port, "/api/ingredients/export", { cookie: cookieA });
  assert.equal(exported.status, 200);
  assert.match(exported.body.data.csv, /name,category,quantity/);

  const imported = await call(port, "/api/ingredients/import", {
    method: "POST",
    cookie: cookieA,
    body: {
      csv: [
        "name,category,quantity,unit,storageType,purchasedAt,expirationDate,status,memo",
        "가져오기우유,유제품,1,개,REFRIGERATED,,,ACTIVE,",
      ].join("\n"),
    },
  });
  assert.equal(imported.status, 201);
  assert.equal(imported.body.data.createdCount, 1);

  const templates = await call(port, "/api/ingredients/quick-templates", { cookie: cookieA });
  assert.equal(templates.status, 200);
  assert.ok(templates.body.data.length >= 1);

  const removed = await call(port, `/api/ingredients/${unknown.id}`, {
    method: "DELETE",
    cookie: cookieA,
  });
  assert.equal(removed.status, 200);
  const trashed = await call(port, `/api/ingredients/${unknown.id}`, { cookie: cookieA });
  assert.equal(trashed.status, 200);
  assert.equal(trashed.body.data.status, "DELETED");
  const purged = await call(port, `/api/ingredients/${unknown.id}/purge`, {
    method: "POST",
    cookie: cookieA,
  });
  assert.equal(purged.status, 200);
  const missing = await call(port, `/api/ingredients/${unknown.id}`, { cookie: cookieA });
  assert.equal(missing.status, 404);

  const logout = await call(port, "/api/auth/logout", { method: "POST", cookie: cookieA });
  assert.equal(logout.status, 200);
  const revoked = await call(port, "/api/auth/me", { cookie: cookieA });
  assert.equal(revoked.status, 401);

  const relogin = await call(port, "/api/auth/login", {
    method: "POST",
    body: { email: "cook@example.com", password: "wrong-password" },
  });
  assert.equal(relogin.status, 401);

  const loginAgain = await call(port, "/api/auth/login", {
    method: "POST",
    body: { email: "cook@example.com", password: "password1234" },
  });
  assert.equal(loginAgain.status, 200);

  const withdrawn = await call(port, "/api/auth/me", { method: "DELETE", cookie: cookieB });
  assert.equal(withdrawn.status, 200);
  const gone = await call(port, "/api/auth/login", {
    method: "POST",
    body: { email: "other@example.com", password: "password1234" },
  });
  assert.equal(gone.status, 401);
});
