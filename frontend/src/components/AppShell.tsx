"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { BarChart3, CalendarDays, CheckCheck, LayoutDashboard, LogOut, Package, Trash2, UserRound } from "lucide-react";
import { BrandLink } from "@/components/BrandLink";
import { api } from "@/lib/api";
import { showExpiryBrowserNotifications } from "@/lib/notifications";
import type { User } from "@/lib/types";
import { LoadingBlock, selectedTabClass } from "./ui";

function isCurrent(pathname: string, href: string) {
  if (href === "/ingredients") return pathname === "/ingredients" || pathname.startsWith("/ingredients/");
  return pathname === href;
}

function NavLink({ href, pathname, children, className = "" }: { href: string; pathname: string; children: React.ReactNode; className?: string }) {
  const active = isCurrent(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={selectedTabClass(active, `inline-flex items-center gap-1.5 text-center font-medium ${className}`)}
    >
      {children}
    </Link>
  );
}

const SessionContext = createContext<{ user: User; setUser: (user: User) => void } | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("세션을 찾을 수 없습니다.");
  return session;
}

function AccountMenu({ user, onLogout }: { user: User; onLogout: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const label = user.nickname || user.email;
  const initial = label.trim().charAt(0).toUpperCase() || "냉";

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-xs font-semibold text-white">{initial}</span>
        <span className="hidden max-w-40 truncate text-slate-700 lg:inline">{label}</span>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <p className="truncate px-3 py-2 text-xs text-slate-500">{user.email}</p>
          <Link
            href="/stats"
            role="menuitem"
            aria-current={pathname === "/stats" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
              pathname === "/stats" ? "bg-brand-light font-medium text-brand" : "text-foreground hover:bg-brand-light"
            }`}
            onClick={() => setOpen(false)}
          >
            <BarChart3 className="size-4" />
            통계
          </Link>
          <Link
            href="/trash"
            role="menuitem"
            aria-current={pathname === "/trash" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
              pathname === "/trash" ? "bg-brand-light font-medium text-brand" : "text-foreground hover:bg-brand-light"
            }`}
            onClick={() => setOpen(false)}
          >
            <Trash2 className="size-4" />
            휴지통
          </Link>
          <Link
            href="/account"
            role="menuitem"
            aria-current={pathname === "/account" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
              pathname === "/account" ? "bg-brand-light font-medium text-brand" : "text-foreground hover:bg-brand-light"
            }`}
            onClick={() => setOpen(false)}
          >
            <UserRound className="size-4" />
            내 정보
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            onClick={onLogout}
          >
            <LogOut className="size-4" />
            로그아웃
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertText, setAlertText] = useState("");

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((next) => {
        if (active) setUser(next);
      })
      .catch(() => {
        if (active) router.replace("/login");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    api
      .expiryAlerts()
      .then((alerts) => {
        if (!active) return;
        void showExpiryBrowserNotifications(alerts);
        const parts: string[] = [];
        if (alerts.d0.length > 0) parts.push(`오늘까지 ${alerts.d0.length}개`);
        if (alerts.d3.length > 0) parts.push(`3일 뒤 ${alerts.d3.length}개`);
        setAlertText(parts.join(" · "));
      })
      .catch(() => {
        // 배너는 보조 UX라 실패해도 앱 사용을 막지 않는다. 대상 없음과 구분해 짧게 표시.
        if (active) setAlertText("알림 정보를 불러오지 못했습니다");
      });
    return () => {
      active = false;
    };
  }, [user]);

  async function logout() {
    await api.logout();
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <LoadingBlock />
      </div>
    );
  }

  if (!user) return null;

  const desktopNav: { href: string; label: string; icon: ReactNode }[] = [
    { href: "/dashboard", label: "대시보드", icon: <LayoutDashboard className="size-3.5" /> },
    { href: "/plan", label: "먹을 것", icon: <CalendarDays className="size-3.5" /> },
    { href: "/ingredients", label: "식재료", icon: <Package className="size-3.5" /> },
    { href: "/consumed", label: "소비", icon: <CheckCheck className="size-3.5" /> },
  ];

  const mobileNav: { href: string; label: string; icon: ReactNode }[] = [
    { href: "/dashboard", label: "홈", icon: <LayoutDashboard className="size-5" /> },
    { href: "/plan", label: "먹을 것", icon: <CalendarDays className="size-5" /> },
    { href: "/ingredients", label: "식재료", icon: <Package className="size-5" /> },
    { href: "/consumed", label: "소비", icon: <CheckCheck className="size-5" /> },
    { href: "/account", label: "내 정보", icon: <UserRound className="size-5" /> },
  ];

  return (
    <SessionContext.Provider value={{ user, setUser }}>
      <div className="min-h-screen pb-20 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <div className="relative flex h-16 items-center justify-between">
              <BrandLink href="/dashboard" />
              <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex" aria-label="주요 메뉴">
                {desktopNav.map((item) => (
                  <NavLink key={item.href} href={item.href} pathname={pathname}>
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <AccountMenu user={user} onLogout={logout} />
            </div>
          </div>
        </header>
        {alertText ? (
          <div className="border-b border-amber-200 bg-amber-50">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm text-amber-900 md:px-8">
              <p>
                유통기한 알림 · {alertText}
                <span className="text-amber-700/80">
                  {" "}
                  · 앱을 열 때 확인
                  {!user.notificationSettings?.enabled ? (
                    <>
                      {" "}
                      ·{" "}
                      <Link href="/account" className="underline underline-offset-2">
                        알림 설정
                      </Link>
                    </>
                  ) : null}
                </span>
              </p>
              <Link href="/plan" className="font-medium text-amber-950 underline underline-offset-2">
                먹을 것 보기
              </Link>
            </div>
          </div>
        ) : null}
        <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">{children}</main>
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
          aria-label="모바일 메뉴"
        >
          <div className="mx-auto grid max-w-6xl grid-cols-5 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
            {mobileNav.map((item) => {
              const active = isCurrent(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`grid place-items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-medium ${
                    active ? "text-brand" : "text-slate-500"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </SessionContext.Provider>
  );
}
