import assert from "node:assert/strict";
import test from "node:test";
import { diffDays, freshnessOf, isRealDate } from "./expiration";

test("유통기한 상태는 서울 날짜 기준으로 계산한다", () => {
  const today = "2026-11-03";
  assert.equal(freshnessOf("2026-11-02", today), "EXPIRED");
  assert.equal(freshnessOf("2026-11-03", today), "EXPIRING");
  assert.equal(freshnessOf("2026-11-04", today), "EXPIRING");
  assert.equal(freshnessOf("2026-11-06", today), "EXPIRING");
  assert.equal(freshnessOf("2026-11-07", today), "FRESH");
  assert.equal(freshnessOf(null, today), "UNKNOWN");
  assert.equal(diffDays(today, "2026-11-06"), 3);
});

test("존재하지 않는 날짜는 거절한다", () => {
  assert.equal(isRealDate("2026-02-31"), false);
  assert.equal(isRealDate("2026-11-03"), true);
});
