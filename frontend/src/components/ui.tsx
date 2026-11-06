import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, ChevronDown, PackageOpen, RefreshCw } from "lucide-react";
import type { Freshness } from "@/lib/types";
import { FRESHNESS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const cardClass = "rounded-3xl border border-slate-200/80 bg-white shadow-sm";

export const brandTextLinkClass = "font-medium text-brand hover:text-brand-hover hover:underline";

const tone: Record<Freshness, string> = {
  FRESH: "bg-[#DCFCE7] text-[#16A34A]",
  EXPIRING: "bg-amber-100 text-amber-600",
  EXPIRED: "bg-red-100 text-red-600",
  UNKNOWN: "bg-slate-100 text-slate-500",
};

function fieldClass(invalid = false) {
  return `w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:ring-4 ${
    invalid
      ? "border-red-300 focus:border-red-500 focus:ring-red-100"
      : "border-slate-200 focus:border-brand focus:ring-brand/10"
  }`;
}

const filterClass =
  "h-10 w-full rounded-md border border-slate-300 bg-white px-4 text-sm text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

const filterSelectedClass =
  "h-10 w-full rounded-md border border-brand bg-brand-light px-4 text-sm font-medium text-brand outline-none hover:border-brand-hover focus:ring-2 focus:ring-brand/30";

function controlClass({ invalid = false, variant = "field", selected = false }: { invalid?: boolean; variant?: "field" | "filter"; selected?: boolean }) {
  if (variant === "filter") return selected ? filterSelectedClass : filterClass;
  return fieldClass(invalid);
}

type ControlProps = { invalid?: boolean; variant?: "field" | "filter"; selected?: boolean };

export function Input({ invalid, variant, selected, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & ControlProps) {
  return <input className={cn(controlClass({ invalid, variant, selected }), className)} {...props} />;
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

export function TextArea({ invalid, variant, selected, className = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & ControlProps) {
  return <textarea className={cn(controlClass({ invalid, variant, selected }), className)} {...props} />;
}

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-hover active:scale-[0.98]",
        secondary: "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98]",
        outline: "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98]",
        outlineDanger: "border border-red-300 bg-white text-red-600 hover:border-red-400 hover:bg-red-50 active:scale-[0.98]",
        ghost: "text-slate-700 hover:bg-slate-100 active:scale-[0.98]",
        danger: "text-red-600 hover:bg-red-50 active:scale-[0.98]",
        dangerSolid: "bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]",
        compact: "border border-brand bg-white text-brand hover:bg-brand-light active:scale-[0.98]",
        brand: "border border-brand bg-white text-brand hover:bg-brand-light active:scale-[0.98]",
        pager: "border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 active:scale-[0.98]",
        quiet: "font-medium text-slate-500 hover:bg-slate-100 active:scale-[0.98]",
        link: "font-medium text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand",
        underline: "font-medium underline",
        tab: "rounded-full font-medium",
        chip: "rounded-full font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-8 text-base",
        icon: "h-8 w-8",
        auto: "h-auto px-0 py-0",
        pill: "h-auto px-3.5 py-1.5",
      },
      selected: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      { variant: "tab", selected: true, class: "rounded-none border-b-2 border-brand text-brand" },
      { variant: "tab", selected: false, class: "rounded-none border-b-2 border-transparent text-slate-500 hover:text-slate-800" },
      { variant: "tab", class: "h-10 px-3.5 font-semibold" },
      { variant: "chip", selected: true, class: "border border-brand bg-brand-light text-brand" },
      { variant: "chip", selected: false, class: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" },
      { variant: "chip", class: "h-8 px-3" },
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
  if (variant === "primary" || variant === "dangerSolid") return "lg";
  if (variant === "compact" || variant === "pager" || variant === "quiet") return "sm";
  if (variant === "link" || variant === "underline") return "auto";
  if (variant === "tab" || variant === "chip") return "pill";
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
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ freshness }: { freshness: Freshness }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${tone[freshness]}`}>
      {FRESHNESS_LABEL[freshness]}
    </span>
  );
}

export function LoadingBlock({ label = "불러오는 중..." }: { label?: string }) {
  return (
    <div className="grid min-h-40 place-items-center text-sm text-slate-500" role="status">
      {label}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
        <PackageOpen className="size-5" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`${cardClass} ${className}`}>{children}</section>;
}

export function selectedTabClass(active: boolean, className = "") {
  return `rounded-full px-3.5 py-1.5 text-sm font-medium ${
    active ? "bg-brand-light text-brand" : "text-muted hover:bg-brand-light hover:text-brand"
  } ${className}`;
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
      ) : null}
      {hint ? <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function FormMessage({ error = false, children }: { error?: boolean; children: React.ReactNode }) {
  return (
    <p className={`mt-4 rounded-xl px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-brand-light text-brand"}`}>{children}</p>
  );
}

export function Modal({
  titleId,
  onClose,
  panelClassName,
  children,
}: {
  titleId: string;
  onClose: () => void;
  panelClassName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid cursor-pointer place-items-center bg-slate-900/30 px-4 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={panelClassName}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
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
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="font-medium text-slate-700">
        총 <span className="tabular-nums text-brand">{total}</span>개
        {totalPages > 1 ? <span className="ml-2 font-normal text-slate-500">{page} / {totalPages} 페이지</span> : null}
      </p>
      {totalPages > 1 ? (
        <div className="flex gap-2">
          <Button variant="pager" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            이전
          </Button>
          <Button variant="pager" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
            다음
          </Button>
        </div>
      ) : null}
    </div>
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
    <Modal titleId="confirm-title" onClose={onClose} panelClassName="w-full max-w-md cursor-default rounded-3xl bg-white p-6 shadow-xl">
      <h2 id="confirm-title" className="flex items-center gap-2 text-lg font-semibold text-slate-800">
        {tone === "danger" ? <AlertTriangle className="size-4 text-red-500" aria-hidden="true" /> : null}
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{description}</p>
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
