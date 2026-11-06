import Link from "next/link";

export function BrandLink({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand text-white shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M4 10h16" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 6.5h.01M9 13.5v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-base font-semibold text-foreground">냉털</span>
    </Link>
  );
}
