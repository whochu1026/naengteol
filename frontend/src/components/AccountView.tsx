"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog, Field, FormMessage, Input, PageHeader, PasswordInput, Toast, cardClass, useToastNotice } from "@/components/ui";
import { isDemoEmail, PASSWORD_HINT } from "@/lib/format";
import { useSession } from "@/components/AppShell";
import { api, fieldMessage } from "@/lib/api";
import {
  browserPermissionLabel,
  ensureNotificationPermission,
  getBrowserNotificationPermission,
  type BrowserPermission,
} from "@/lib/notifications";
import type { FieldError, NotificationSettings } from "@/lib/types";

const DEFAULT_ALERTS: NotificationSettings = { enabled: false, notifyD3: true, notifyD0: true };

function passwordError(value: string) {
  if (!value) return "새 비밀번호를 입력해 주세요.";
  if (value.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (value.length > 20) return "비밀번호는 20자 이하여야 합니다.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "비밀번호는 영문과 숫자를 모두 포함해야 합니다.";
}

export function AccountView() {
  const router = useRouter();
  const { user, setUser } = useSession();
  const [notice, setNotice] = useToastNotice();
  const [nickname, setNickname] = useState(user.nickname);
  const [profileErrors, setProfileErrors] = useState<FieldError[]>([]);
  const [profileMessage, setProfileMessage] = useState("");
  const [profilePending, setProfilePending] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<FieldError[]>([]);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawPending, setWithdrawPending] = useState(false);
  const [withdrawConsent, setWithdrawConsent] = useState(false);
  const [alerts, setAlerts] = useState<NotificationSettings>(user.notificationSettings ?? DEFAULT_ALERTS);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertError, setAlertError] = useState(false);
  const [alertPending, setAlertPending] = useState(false);
  const [permission, setPermission] = useState<BrowserPermission>("default");
  const [dueSummary, setDueSummary] = useState("");

  useEffect(() => {
    setPermission(getBrowserNotificationPermission());
    api
      .expiryAlerts()
      .then((data) => {
        const parts: string[] = [];
        if (data.d0.length > 0) parts.push(`당일·만료 ${data.d0.length}개`);
        if (data.d3.length > 0) parts.push(`D-3 ${data.d3.length}개`);
        setDueSummary(parts.join(" · "));
      })
      .catch(() => setDueSummary(""));
  }, []);

  async function saveNickname(event: React.FormEvent) {
    event.preventDefault();
    const next = nickname.trim();
    if (!next) {
      setProfileErrors([{ field: "nickname", message: "닉네임을 입력해 주세요." }]);
      setProfileMessage("");
      return;
    }
    if (next.length > 20) {
      setProfileErrors([{ field: "nickname", message: "닉네임은 20자 이하여야 합니다." }]);
      setProfileMessage("");
      return;
    }
    setProfilePending(true);
    setProfileErrors([]);
    setProfileMessage("");
    try {
      const updated = await api.updateNickname(next);
      setUser(updated);
      setNickname(updated.nickname);
      setNotice("닉네임을 저장했습니다.");
    } catch (error) {
      const known = error as { message?: string; errors?: FieldError[] };
      setProfileErrors(known.errors ?? []);
      if (!known.errors?.length) {
        setProfileMessage(known.message || "저장하지 못했습니다.");
      }
    } finally {
      setProfilePending(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: FieldError[] = [];
    if (!currentPassword) nextErrors.push({ field: "currentPassword", message: "현재 비밀번호를 입력해 주세요." });
    const nextPasswordError = passwordError(newPassword);
    if (nextPasswordError) nextErrors.push({ field: "newPassword", message: nextPasswordError });
    if (newPassword !== confirmPassword) {
      nextErrors.push({ field: "confirmPassword", message: "비밀번호 확인이 일치하지 않습니다." });
    }
    setPasswordErrors(nextErrors);
    setPasswordMessage("");
    if (nextErrors.length > 0) return;

    setPasswordPending(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice("비밀번호를 변경했습니다.");
    } catch (error) {
      const known = error as { message?: string; errors?: FieldError[] };
      setPasswordErrors(known.errors ?? []);
      if (!known.errors?.length) {
        setPasswordMessage(known.message || "변경하지 못했습니다.");
      }
    } finally {
      setPasswordPending(false);
    }
  }

  async function withdraw() {
    setWithdrawPending(true);
    try {
      await api.withdraw();
      router.replace("/login");
    } finally {
      setWithdrawPending(false);
    }
  }

  async function saveAlerts(event: React.FormEvent) {
    event.preventDefault();
    setAlertPending(true);
    setAlertMessage("");
    setAlertError(false);
    try {
      let next = alerts;
      let note = "";
      let noteError = false;

      if (alerts.enabled) {
        const nextPermission = await ensureNotificationPermission();
        setPermission(nextPermission);
        if (nextPermission === "denied") {
          next = { ...alerts, enabled: false };
          setAlerts(next);
          noteError = true;
          note =
            "브라우저에서 알림이 차단되어 있습니다. 주소창 왼쪽 자물쇠(또는 사이트 설정) → 알림 허용 후 다시 켜 주세요. 그동안은 앱을 열 때 상단 배너로만 안내합니다.";
        } else if (nextPermission === "unsupported") {
          note = "이 브라우저는 시스템 알림을 지원하지 않습니다. 앱을 열 때 상단 배너로만 안내합니다.";
        }
      }

      const updated = await api.updateProfile({ notificationSettings: next });
      setUser(updated);
      setAlerts(updated.notificationSettings);
      if (noteError) {
        setAlertError(true);
        setAlertMessage(note);
      } else if (note) {
        setAlertError(false);
        setAlertMessage(note);
      } else {
        setNotice(
          updated.notificationSettings.enabled
            ? "알림을 켰습니다. 앱을 다시 열 때 D-3·당일 항목을 확인합니다."
            : "알림 설정을 저장했습니다.",
        );
      }
    } catch (error) {
      setAlertError(true);
      setAlertMessage((error as Error).message || "저장하지 못했습니다.");
    } finally {
      setAlertPending(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <PageHeader title="마이페이지" description="닉네임, 알림, 비밀번호를 관리할 수 있습니다." />
      <Toast message={notice} />

      <form onSubmit={saveNickname} className={`${cardClass} p-5 md:p-6`}>
        <h2 className="text-base font-semibold text-slate-800">프로필</h2>
        {profileMessage ? (
          <FormMessage className="mt-3" error>
            {profileMessage}
          </FormMessage>
        ) : null}
        <Field label="이메일" className="mt-4">
          <Input className="bg-slate-50 text-slate-500" value={user.email} readOnly />
        </Field>
        <Field label="닉네임" className="mt-4" error={fieldMessage(profileErrors, "nickname")} hint="20자 이내로 입력해 주세요.">
          <Input
            invalid={Boolean(fieldMessage(profileErrors, "nickname"))}
            value={nickname}
            maxLength={20}
            onChange={(event) => setNickname(event.target.value)}
          />
        </Field>
        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={profilePending}>
            {profilePending ? "저장 중..." : "저장"}
          </Button>
        </div>
      </form>

      <form onSubmit={saveAlerts} className={`${cardClass} p-5 md:p-6`}>
        <h2 className="text-base font-semibold text-slate-800">유통기한 알림</h2>
        <div className="mt-1 space-y-1.5 text-sm leading-6 break-keep text-pretty text-slate-500">
          <p>
            지금은 백그라운드 푸시가 아니라,{" "}
            <span className="font-medium text-slate-700">앱을 열 때</span> D-3·당일 항목을 확인합니다.
          </p>
          <p>
            권한을 허용하면 같은 타이밍에{" "}
            <span className="font-medium text-slate-700">브라우저 알림도</span> 함께 뜹니다.
          </p>
        </div>
        <div className="mt-3 rounded-[var(--radius-control)] bg-slate-50 px-3 py-2.5 text-sm leading-6 break-keep text-slate-600">
          <p className="font-medium text-slate-700">{browserPermissionLabel(permission)}</p>
          <p className="mt-1 text-pretty text-muted">
            {dueSummary ? (
              <>
                오늘 기준 알림 대상:
                <br className="sm:hidden" /> {dueSummary}
              </>
            ) : (
              <>
                오늘 기준 알림 대상이 없습니다.
                <br className="sm:hidden" /> 임박·만료 재료가 생기면 여기에 표시됩니다.
              </>
            )}
          </p>
        </div>
        {alertMessage ? (
          <FormMessage className="mt-3 break-keep text-pretty" error={alertError}>
            {alertMessage}
          </FormMessage>
        ) : null}
        {permission === "denied" ? (
          <p className="mt-3 text-sm leading-6 break-keep text-pretty text-red-600">
            알림이 차단된 상태입니다.
            <br className="sm:hidden" /> 브라우저 사이트 설정에서 알림을 허용한 뒤 다시 저장해 주세요.
          </p>
        ) : null}
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-brand"
            checked={alerts.enabled}
            onChange={(event) => setAlerts((prev) => ({ ...prev, enabled: event.target.checked }))}
          />
          <span className="break-keep">앱을 열 때 알림 확인</span>
        </label>
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-brand"
            checked={alerts.notifyD3}
            disabled={!alerts.enabled}
            onChange={(event) => setAlerts((prev) => ({ ...prev, notifyD3: event.target.checked }))}
          />
          <span className="break-keep">3일 전 (D-3)</span>
        </label>
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 size-4 shrink-0 accent-brand"
            checked={alerts.notifyD0}
            disabled={!alerts.enabled}
            onChange={(event) => setAlerts((prev) => ({ ...prev, notifyD0: event.target.checked }))}
          />
          <span className="break-keep">당일·만료</span>
        </label>
        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={alertPending}>
            {alertPending ? "저장 중..." : "알림 설정 저장"}
          </Button>
        </div>
      </form>

      <form onSubmit={savePassword} className={`${cardClass} p-5 md:p-6`}>
        <h2 className="text-base font-semibold text-slate-800">비밀번호</h2>
        {isDemoEmail(user.email) ? (
          <p className="mt-1 text-sm text-slate-500">데모 계정은 임의 비밀번호로 만들어져 여기서 바꿀 수 없습니다.</p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">현재 비밀번호 확인 후 새 비밀번호로 변경합니다.</p>
        )}
        {passwordMessage ? (
          <FormMessage className="mt-3" error>
            {passwordMessage}
          </FormMessage>
        ) : null}
        <Field label="현재 비밀번호" className="mt-4" error={fieldMessage(passwordErrors, "currentPassword")}>
          <PasswordInput
            invalid={Boolean(fieldMessage(passwordErrors, "currentPassword"))}
            autoComplete="current-password"
            value={currentPassword}
            disabled={isDemoEmail(user.email)}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
        </Field>
        <Field label="새 비밀번호" className="mt-4" error={fieldMessage(passwordErrors, "newPassword")} hint={PASSWORD_HINT}>
          <PasswordInput
            invalid={Boolean(fieldMessage(passwordErrors, "newPassword"))}
            autoComplete="new-password"
            value={newPassword}
            disabled={isDemoEmail(user.email)}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </Field>
        <Field label="새 비밀번호 확인" className="mt-4" error={fieldMessage(passwordErrors, "confirmPassword")}>
          <PasswordInput
            invalid={Boolean(fieldMessage(passwordErrors, "confirmPassword"))}
            autoComplete="new-password"
            value={confirmPassword}
            disabled={isDemoEmail(user.email)}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </Field>
        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={passwordPending || isDemoEmail(user.email)}>
            {passwordPending ? "변경 중..." : "비밀번호 변경"}
          </Button>
        </div>
      </form>

      <section className="rounded-[var(--radius-card)] border border-red-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-base font-semibold text-slate-800">회원 탈퇴</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          계정과 등록한 식재료가 함께 삭제됩니다. 삭제한 데이터는 복구할 수 없습니다.
        </p>
        <div className="mt-4 grid gap-3">
          <label className="flex min-w-0 cursor-pointer items-start gap-2.5 text-sm break-keep text-slate-700">
            <input
              type="checkbox"
              checked={withdrawConsent}
              onChange={(event) => setWithdrawConsent(event.target.checked)}
              className="mt-0.5 size-4 shrink-0 rounded border-slate-300 text-brand accent-brand"
            />
            <span>위 내용을 확인했으며, 회원 탈퇴에 동의합니다.</span>
          </label>
          <div className="flex justify-end">
            <Button variant="outlineDanger" disabled={!withdrawConsent} onClick={() => setWithdrawOpen(true)}>
              회원 탈퇴
            </Button>
          </div>
        </div>
      </section>

      {withdrawOpen ? (
        <ConfirmDialog
          title="회원 탈퇴"
          description={[
            "계정과 함께 등록된 모든 식재료 및 관련 데이터가 영구 삭제됩니다.",
            "삭제된 데이터는 복구할 수 없습니다.",
            "탈퇴를 진행하기 전에 필요한 정보가 있는지 확인해 주세요.",
          ].join("\n")}
          confirmLabel="탈퇴"
          pending={withdrawPending}
          onClose={() => setWithdrawOpen(false)}
          onConfirm={withdraw}
        />
      ) : null}
    </div>
  );
}
