"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandLink } from "@/components/BrandLink";
import { Button, Field, Input, brandTextLinkClass, cardClass } from "@/components/ui";
import { api, fieldMessage } from "@/lib/api";
import { PASSWORD_HINT } from "@/lib/format";

type FieldErrorItem = { field: string; message: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(value: string) {
  const email = value.trim();
  if (!email) return "이메일을 입력해 주세요.";
  if (email.length > 255 || !EMAIL_PATTERN.test(email)) return "이메일 형식이 올바르지 않습니다.";
}

function passwordError(value: string, mode: "login" | "signup") {
  if (!value) return "비밀번호를 입력해 주세요.";
  if (mode === "login") return;
  if (value.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  if (value.length > 20) return "비밀번호는 20자 이하여야 합니다.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "비밀번호는 영문과 숫자를 모두 포함해야 합니다.";
}

function validateAuth(input: {
  email: string;
  password: string;
  confirm?: string;
  mode: "login" | "signup";
}): FieldErrorItem[] {
  const errors: FieldErrorItem[] = [];
  const emailMessage = emailError(input.email);
  const passwordMessage = passwordError(input.password, input.mode);
  if (emailMessage) errors.push({ field: "email", message: emailMessage });
  if (passwordMessage) errors.push({ field: "password", message: passwordMessage });
  if (input.mode === "signup" && input.password !== (input.confirm ?? "")) {
    errors.push({ field: "passwordConfirm", message: "비밀번호 확인이 일치하지 않습니다." });
  }
  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrorItem[]>([]);
  const [pending, setPending] = useState<"login" | "demo" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.me().then(() => router.replace("/dashboard")).catch(() => undefined);
  }, [router]);

  function applyLogin(nextEmail: string, nextPassword: string) {
    if (!submitted) return;
    setErrors(validateAuth({ email: nextEmail, password: nextPassword, mode: "login" }));
    setMessage("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const nextErrors = validateAuth({ email, password, mode: "login" });
    setErrors(nextErrors);
    setMessage("");
    if (nextErrors.length > 0) return;

    setPending("login");
    try {
      await api.login(email, password);
      router.replace("/dashboard");
    } catch (error) {
      const known = error as { message?: string; errors?: FieldErrorItem[] };
      setMessage(known.message || "로그인하지 못했습니다.");
      setErrors(known.errors ?? []);
    } finally {
      setPending(null);
    }
  }

  async function onDemoLogin() {
    setPending("demo");
    setMessage("");
    setErrors([]);
    try {
      await api.demoLogin();
      router.replace("/dashboard");
    } catch (error) {
      const known = error as { message?: string };
      setMessage(known.message || "데모 계정으로 로그인하지 못했습니다.");
    } finally {
      setPending(null);
    }
  }

  return (
    <AuthCard
      title="로그인"
      description="냉장고에 있는 재료부터 확인해 보세요."
      footer={
        <>
          계정이 없나요?{" "}
          <Link href="/signup" className={brandTextLinkClass}>
            회원가입
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        {message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
        <Field label="이메일" error={fieldMessage(errors, "email")}>
          <Input
            invalid={Boolean(fieldMessage(errors, "email"))}
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => {
              setEmail(event.target.value);
              applyLogin(event.target.value, password);
            }}
          />
        </Field>
        <Field label="비밀번호" error={fieldMessage(errors, "password")}>
          <Input
            invalid={Boolean(fieldMessage(errors, "password"))}
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => {
              setPassword(event.target.value);
              applyLogin(email, event.target.value);
            }}
          />
        </Field>
        <Button type="submit" disabled={pending !== null} className="w-full">
          {pending === "login" ? "로그인 중..." : "로그인"}
        </Button>
        <div className="rounded-2xl border border-brand/20 bg-brand-light px-4 py-4">
          <p className="text-sm font-semibold text-brand">데모 계정으로 둘러보기</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            가입 없이 식재료 등록·유통기한 관리·소비 완료 흐름을 바로 확인할 수 있습니다.
          </p>
          <p className="mt-2 text-xs text-slate-500">계정: demo@naengteol.local</p>
          <Button type="button" variant="brand" disabled={pending !== null} className="mt-3 w-full" onClick={onDemoLogin}>
            {pending === "demo" ? "데모 계정 로그인 중..." : "데모 계정으로 로그인"}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrorItem[]>([]);
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function applySignup(nextEmail: string, nextPassword: string, nextConfirm: string) {
    if (!submitted) return;
    setErrors(validateAuth({ email: nextEmail, password: nextPassword, confirm: nextConfirm, mode: "signup" }));
    setMessage("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const nextErrors = validateAuth({ email, password, confirm, mode: "signup" });
    setErrors(nextErrors);
    setMessage("");
    if (nextErrors.length > 0) return;

    setPending(true);
    try {
      await api.signup(email, password);
      router.replace("/dashboard");
    } catch (error) {
      const known = error as { message?: string; errors?: FieldErrorItem[] };
      setMessage(known.message || "가입하지 못했습니다.");
      setErrors(known.errors ?? []);
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthCard
      title="회원가입"
      description="이메일로 냉털을 시작하세요."
      footer={
        <>
          이미 계정이 있나요?{" "}
          <Link href="/login" className={brandTextLinkClass}>
            로그인
          </Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit} className="grid gap-4">
        {message ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
        <Field label="이메일" error={fieldMessage(errors, "email")}>
          <Input
            invalid={Boolean(fieldMessage(errors, "email"))}
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => {
              setEmail(event.target.value);
              applySignup(event.target.value, password, confirm);
            }}
          />
        </Field>
        <Field label="비밀번호" error={fieldMessage(errors, "password")} hint={PASSWORD_HINT}>
          <Input
            invalid={Boolean(fieldMessage(errors, "password"))}
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(event) => {
              setPassword(event.target.value);
              applySignup(email, event.target.value, confirm);
            }}
          />
        </Field>
        <Field label="비밀번호 확인" error={fieldMessage(errors, "passwordConfirm")}>
          <Input
            invalid={Boolean(fieldMessage(errors, "passwordConfirm"))}
            type="password"
            value={confirm}
            autoComplete="new-password"
            onChange={(event) => {
              setConfirm(event.target.value);
              applySignup(email, password, event.target.value);
            }}
          />
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "가입 중..." : "회원가입"}
        </Button>
      </form>
    </AuthCard>
  );
}

function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200/80 bg-white/90">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4 md:px-8">
          <BrandLink href="/login" />
        </div>
      </header>
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
        <div>
          <p className="text-sm font-medium text-brand">냉장고 재고</p>
          <h1 className="mt-3 max-w-md text-4xl font-bold leading-tight text-foreground">
            냉장고 속 재료를 한눈에,
            <br />
            버리는 음식은 줄이게.
          </h1>
          <p className="mt-4 max-w-md text-sm font-normal leading-6 text-slate-500">
            보유 중인 식재료와 유통기한을 기록하고, 임박한 재료부터 먼저 확인하세요.
          </p>
        </div>
        <section className={`${cardClass} w-full p-6 md:p-8`}>
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1.5 text-sm font-normal text-slate-500">{description}</p>
          <div className="mt-7">{children}</div>
          <p className="mt-6 text-sm text-slate-500">{footer}</p>
        </section>
      </div>
    </div>
  );
}
