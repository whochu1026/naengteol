"use client";

import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeOff,
  PackageOpen,
  RefreshCw,
  X,
} from "lucide-react";
import type { Freshness } from "@/lib/types";
import { FRESHNESS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const cardClass =
  "rounded-[var(--radius-card)] border border-border/90 bg-surface shadow-[var(--shadow-soft)]";

export const brandTextLinkClass = "font-medium text-brand hover:text-brand-hover hover:underline underline-offset-2";

const tone: Record<Freshness, string> = {
  FRESH: "bg-brand-light text-brand",
  EXPIRING: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/80",
  EXPIRED: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/80",
  UNKNOWN: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/80",
};

const controlBase =
  "w-full rounded-[var(--radius-control)] border bg-surface text-sm text-foreground outline-none transition-colors";

function fieldTone(invalid = false) {
  return invalid
    ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100"
    : "border-border focus:border-brand focus:ring-4 focus:ring-brand/10";
}

const filterClass =
  "h-10 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20";

const filterSelectedClass =
  "h-10 w-full rounded-[var(--radius-control)] border border-brand bg-brand-light px-3.5 text-sm font-medium text-brand outline-none transition-colors hover:border-brand-hover focus:ring-2 focus:ring-brand/20";

function controlClass({ invalid = false, variant = "field", selected = false }: { invalid?: boolean; variant?: "field" | "filter"; selected?: boolean }) {
  if (variant === "filter") return selected ? filterSelectedClass : filterClass;
  return cn(controlBase, "h-10 px-3.5", fieldTone(invalid));
}

type ControlProps = { invalid?: boolean; variant?: "field" | "filter"; selected?: boolean };

export function Input({ invalid, variant, selected, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & ControlProps) {
  return <input className={cn(controlClass({ invalid, variant, selected }), className)} {...props} />;
}

export function PasswordInput({
  invalid,
  className = "",
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & Pick<ControlProps, "invalid">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={cn(controlClass({ invalid }), "pr-11", className)}
      />
      <button
        type="button"
        className="absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-[var(--radius-control)] text-muted hover:bg-brand-light/70 hover:text-foreground"
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

export function Select({ invalid, variant, selected, className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & ControlProps) {
  return (
    <div className="relative">
      <select className={cn(controlClass({ invalid, variant, selected }), "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
    </div>
  );
}

export function TextArea({ invalid, className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & Pick<ControlProps, "invalid">) {
  return <textarea className={cn(controlBase, "min-h-24 px-3.5 py-2.5", fieldTone(invalid), className)} {...props} />;
}

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white shadow-sm hover:bg-brand-hover active:scale-[0.98]",
        secondary: "border border-border bg-surface text-foreground hover:border-brand/40 hover:bg-brand-light/60 active:scale-[0.98]",
        outline: "border border-border bg-surface text-foreground hover:border-brand/40 hover:bg-brand-light/60 active:scale-[0.98]",
        outlineDanger: "border border-red-200 bg-surface text-red-600 hover:border-red-300 hover:bg-red-50 active:scale-[0.98]",
        ghost: "text-foreground hover:bg-brand-light/70 active:scale-[0.98]",
        danger: "text-red-600 hover:bg-red-50 active:scale-[0.98]",
        dangerSolid: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
        compact: "border border-brand/30 bg-surface text-brand hover:bg-brand-light active:scale-[0.98]",
        brand: "border border-brand/30 bg-brand-light text-brand hover:bg-brand/15 active:scale-[0.98]",
        pager: "border border-border bg-surface font-medium text-foreground hover:bg-brand-light/60 disabled:opacity-40 active:scale-[0.98]",
        quiet: "font-medium text-muted hover:bg-brand-light/70 hover:text-foreground active:scale-[0.98]",
        link: "font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand",
        underline: "font-medium underline",
        tab: "rounded-none font-medium",
        chip: "rounded-full font-medium",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-8 w-8",
        auto: "h-auto px-0 py-0",
        chip: "h-8 px-3 text-xs",
        tab: "h-10 px-3.5",
      },
      selected: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "tab", selected: true, class: "border-b-2 border-brand text-brand" },
      { variant: "tab", selected: false, class: "border-b-2 border-transparent text-muted hover:text-foreground" },
      { variant: "tab", class: "font-semibold" },
      { variant: "chip", selected: true, class: "border border-brand bg-brand-light text-brand" },
      { variant: "chip", selected: false, class: "border border-border bg-surface text-muted hover:bg-brand-light/50 hover:text-foreground" },
      { variant: "primary", size: "default", class: "min-w-[5.5rem] px-5" },
      { variant: "dangerSolid", size: "default", class: "min-w-[5.5rem] px-5" },
      { variant: "brand", size: "default", class: "min-w-[5.5rem] px-5" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "default",
      selected: false,
    },
  },
);

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

function defaultButtonSize(variant: ButtonVariantProps["variant"]): ButtonVariantProps["size"] {
  if (variant === "compact" || variant === "pager" || variant === "quiet") return "sm";
  if (variant === "link" || variant === "underline") return "auto";
  if (variant === "tab") return "tab";
  if (variant === "chip") return "chip";
  return "default";
}

export function Button({
  variant = "primary",
  size,
  selected = false,
  className,
  href,
  type = "button",
  children,
  ...props
}: {
  variant?: ButtonVariantProps["variant"];
  size?: ButtonVariantProps["size"];
  selected?: boolean;
  className?: string;
  href?: string;
  type?: "button" | "submit" | "reset";
  children?: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className" | "children">) {
  const classes = cn(buttonVariants({ variant, size: size ?? defaultButtonSize(variant), selected }), className);
  if (href) {
    return (
      <Link href={href} className={classes} onClick={props.onClick as React.MouseEventHandler<HTMLAnchorElement> | undefined}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-[1.65rem] font-semibold tracking-tight break-keep text-foreground md:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm leading-6 break-keep text-pretty text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex w-full min-w-0 justify-end sm:w-auto">{action}</div> : null}
    </div>
  );
}

export function StatusBadge({ freshness }: { freshness: Freshness }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight ${tone[freshness]}`}>
      {FRESHNESS_LABEL[freshness]}
    </span>
  );
}

export function LoadingBlock({ label = "불러오는 중..." }: { label?: string }) {
  return (
    <div className={"grid min-h-56 place-items-center px-6 py-12 text-sm text-muted md:min-h-64"} role="status">
      {label}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div className="flex min-w-0 items-start gap-2.5">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>{message}</p>
      </div>
      {onRetry ? (
        <Button variant="underline" onClick={onRetry}>
          <RefreshCw />
          다시 시도
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`${cardClass} border-dashed px-6 py-16 text-center`}>
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-[var(--radius-control)] bg-brand-light text-brand">
        <PackageOpen className="size-5" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`${cardClass} ${className}`}>{children}</section>;
}

export function selectedTabClass(active: boolean, className = "") {
  return cn(
    "rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium",
    active ? "bg-brand-light text-brand shadow-sm" : "text-muted hover:bg-brand-light/70 hover:text-foreground",
    className,
  );
}

export function Field({
  label,
  required,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1 block text-xs font-normal text-red-600">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

export function FormMessage({
  error = false,
  className,
  children,
}: {
  error?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-[var(--radius-control)] px-3.5 py-2.5 text-sm",
        error ? "border border-red-200 bg-red-50 text-red-700" : "border border-brand/15 bg-brand-light text-brand",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function useToastNotice(durationMs = 3000) {
  const [notice, setNoticeState] = useState("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function setNotice(message: string) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setNoticeState(message);
    if (!message) return;
    timerRef.current = window.setTimeout(() => {
      setNoticeState("");
      timerRef.current = null;
    }, durationMs);
  }

  return [notice, setNotice] as const;
}

export function Toast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4 md:bottom-8"
    >
      <p className="pointer-events-auto max-w-md rounded-[var(--radius-control)] border border-brand/15 bg-surface px-4 py-3 text-sm font-medium text-brand shadow-[var(--shadow-soft)]">
        {message}
      </p>
    </div>
  );
}

export function SelectionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-control)] border border-border bg-surface px-3.5 py-2.5 shadow-sm">
      <p className="inline-flex items-center gap-2 text-sm text-foreground">
        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold tabular-nums text-brand">
          {count}
        </span>
        <span className="font-medium">개 선택됨</span>
      </p>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">{children}</div>
    </div>
  );
}

export function Modal({
  titleId,
  onClose,
  panelClassName,
  closeDisabled = false,
  children,
}: {
  titleId: string;
  onClose: () => void;
  panelClassName: string;
  closeDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-slate-900/30 px-4 backdrop-blur-sm"
      role="presentation"
      onClick={() => {
        if (!closeDisabled) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn("relative", panelClassName)}
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant="quiet"
          size="icon"
          aria-label="닫기"
          disabled={closeDisabled}
          className="absolute top-3 right-3 z-10"
          onClick={onClose}
        >
          <X />
        </Button>
        {children}
      </div>
    </div>
  );
}

function pageWindow(page: number, totalPages: number, size = 5) {
  if (totalPages <= size) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const half = Math.floor(size / 2);
  let start = Math.max(1, page - half);
  let end = start + size - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - size + 1);
  }
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function Pagination({
  page,
  totalPages,
  total,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages = pageWindow(page, totalPages);
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1.5" aria-label="페이지 이동">
      <Button
        type="button"
        variant="pager"
        size="icon"
        disabled={page <= 1}
        aria-label="첫 페이지"
        onClick={() => onPage(1)}
      >
        <ChevronsLeft />
      </Button>
      <Button
        type="button"
        variant="pager"
        size="icon"
        disabled={page <= 1}
        aria-label="이전 페이지"
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft />
      </Button>
      {pages.map((item) => {
        const selected = item === page;
        return (
          <Button
            key={item}
            type="button"
            variant={selected ? "brand" : "pager"}
            size="icon"
            aria-label={`${item} 페이지`}
            aria-current={selected ? "page" : undefined}
            className="tabular-nums"
            onClick={() => onPage(item)}
          >
            {item}
          </Button>
        );
      })}
      <Button
        type="button"
        variant="pager"
        size="icon"
        disabled={page >= totalPages}
        aria-label="다음 페이지"
        onClick={() => onPage(page + 1)}
      >
        <ChevronRight />
      </Button>
      <Button
        type="button"
        variant="pager"
        size="icon"
        disabled={page >= totalPages}
        aria-label="마지막 페이지"
        onClick={() => onPage(totalPages)}
      >
        <ChevronsRight />
      </Button>
      <span className="sr-only">
        전체 {total}개, {page} / {totalPages} 페이지
      </span>
    </nav>
  );
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  tone = "danger",
  pending,
  onConfirm,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      titleId="confirm-title"
      onClose={onClose}
      closeDisabled={pending}
      panelClassName="w-full max-w-md cursor-default rounded-[var(--radius-card)] border border-border bg-surface p-6 shadow-[var(--shadow-soft)]"
    >
      <h2 id="confirm-title" className="flex items-center gap-2 pr-10 text-lg font-semibold text-foreground">
        {tone === "danger" ? <AlertTriangle className="size-4 text-red-500" aria-hidden="true" /> : null}
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          취소
        </Button>
        <Button variant={tone === "danger" ? "dangerSolid" : "primary"} onClick={onConfirm} disabled={pending}>
          {pending ? "처리 중..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
