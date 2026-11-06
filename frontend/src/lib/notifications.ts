import type { ExpiryAlerts } from "./types";

const STORAGE_KEY = "naengteol.alerts.notified";

function todayKey(today: string) {
  return `${STORAGE_KEY}:${today}`;
}

function readNotified(today: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(todayKey(today));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeNotified(today: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(todayKey(today), JSON.stringify([...ids]));
}

export type BrowserPermission = NotificationPermission | "unsupported";

export function getBrowserNotificationPermission(): BrowserPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function ensureNotificationPermission(): Promise<BrowserPermission> {
  const current = getBrowserNotificationPermission();
  if (current === "unsupported" || current === "granted" || current === "denied") return current;
  return Notification.requestPermission();
}

export function browserPermissionLabel(permission: BrowserPermission) {
  if (permission === "granted") return "브라우저 알림 허용됨";
  if (permission === "denied") return "브라우저 알림 차단됨";
  if (permission === "unsupported") return "이 브라우저는 알림 미지원";
  return "브라우저 알림 권한 없음";
}

export async function showExpiryBrowserNotifications(alerts: ExpiryAlerts) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (!alerts.settings.enabled || Notification.permission !== "granted") return;

  const notified = readNotified(alerts.today);
  const messages: { id: string; title: string; body: string }[] = [];

  if (alerts.d0.length > 0) {
    const key = `d0:${alerts.d0.map((item) => item.id).sort().join(",")}`;
    if (!notified.has(key)) {
      messages.push({
        id: key,
        title: "오늘까지인 식재료",
        body:
          alerts.d0.length === 1
            ? `${alerts.d0[0].name} 유통기한이 오늘입니다.`
            : `${alerts.d0[0].name} 외 ${alerts.d0.length - 1}개 유통기한이 오늘입니다.`,
      });
    }
  }

  if (alerts.d3.length > 0) {
    const key = `d3:${alerts.d3.map((item) => item.id).sort().join(",")}`;
    if (!notified.has(key)) {
      messages.push({
        id: key,
        title: "3일 뒤 유통기한",
        body:
          alerts.d3.length === 1
            ? `${alerts.d3[0].name} 유통기한이 3일 남았습니다.`
            : `${alerts.d3[0].name} 외 ${alerts.d3.length - 1}개 유통기한이 3일 남았습니다.`,
      });
    }
  }

  for (const message of messages) {
    new Notification(message.title, { body: message.body, tag: message.id });
    notified.add(message.id);
  }
  if (messages.length > 0) writeNotified(alerts.today, notified);
}
