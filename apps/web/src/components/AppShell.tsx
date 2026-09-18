"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMounted } from "@/lib/use-mounted";
import type { Role } from "@/lib/api";
import { portalScopeCopy } from "@/lib/permissions";

const ALL_NAV = [
  { href: "/", label: "Overview", desc: "Live team signals", roles: ["manager", "administrator", "developer"] as Role[] },
  { href: "/developer-day", label: "Developer day", desc: "Hourly timeline", roles: ["manager", "administrator", "developer"] as Role[] },
  { href: "/my-activity", label: "My activity", desc: "Your own signals", roles: ["developer"] as Role[] },
  { href: "/users", label: "Users", desc: "Org access", roles: ["administrator"] as Role[] },
  { href: "/connectors", label: "Connectors", desc: "Health & versions", roles: ["administrator", "manager", "auditor"] as Role[] },
  { href: "/policy", label: "Policy", desc: "Collection notice", roles: ["manager", "administrator", "auditor", "developer"] as Role[] },
  { href: "/audit", label: "Audit", desc: "Access history", roles: ["auditor", "administrator"] as Role[] },
];

function navActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

function greetingForHour(h: number, name?: string) {
  const hello =
    h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return name ? `${hello}, ${name}` : hello;
}

function roleLabel(role?: Role) {
  if (role === "administrator") return "Admin portal";
  if (role === "developer") return "Developer portal";
  if (role === "auditor") return "Auditor portal";
  return "Manager portal";
}

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const path = usePathname();
  const { user, logout, ready } = useAuth();
  const mounted = useMounted();
  const [menuOpen, setMenuOpen] = useState(false);
  const greetingLine = mounted
    ? greetingForHour(new Date().getHours(), user?.displayName)
    : user?.displayName
      ? `Welcome, ${user.displayName}`
      : "Welcome";

  const nav = useMemo(
    () => ALL_NAV.filter((item) => !user || item.roles.includes(user.role)),
    [user],
  );

  const pathAllowed = useMemo(() => {
    if (!user) return true;
    if (path === "/login") return true;
    if (path.startsWith("/hourly")) {
      return (
        user.role === "manager" ||
        user.role === "administrator" ||
        user.role === "developer"
      );
    }
    return nav.some((item) => navActive(path, item.href));
  }, [user, path, nav]);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  if (!ready) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-surface-canvas text-sm text-surface-muted">
        Loading your portal…
      </div>
    );
  }

  if (path === "/login") {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-surface-canvas text-sm text-surface-muted">
        Redirecting to sign in…
      </div>
    );
  }

  const initials = (user.displayName ?? user.email)
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebar =
    "flex h-full flex-col bg-gradient-to-b from-ink-950 via-ink-900 to-ink-800 text-slate-100";

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-surface-canvas">
      <aside
        className={`hidden h-full w-[272px] shrink-0 ${sidebar} md:flex`}
        aria-label="Main navigation"
      >
        <div className="shrink-0 border-b border-white/5 px-5 py-7">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
              T
            </div>
            <p className="text-sm font-semibold tracking-tight text-white">
              Techlio
            </p>
          </div>
          <h1 className="mt-5 text-xl font-semibold leading-tight text-white">
            {roleLabel(user.role)}
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Agent visibility — not timekeeping
          </p>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            {portalScopeCopy(user.role)}
          </p>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
          {nav.map((item) => {
            const active = navActive(path, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 transition ${
                  active
                    ? "bg-accent/15 text-accent-light ring-1 ring-accent/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="block text-sm font-medium">{item.label}</span>
                <span
                  className={`block text-xs ${active ? "text-teal-200/80" : "text-slate-500"}`}
                >
                  {item.desc}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-sm font-semibold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-lg border border-white/10 py-2 text-xs text-slate-300 hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className={`absolute left-0 top-0 w-[min(100%,280px)] ${sidebar} shadow-2xl`}>
            <div className="flex items-center justify-between px-4 py-4">
              <span className="text-lg font-semibold">{roleLabel(user.role)}</span>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] text-2xl text-slate-400"
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <nav className="space-y-0.5 p-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-3 text-sm font-medium ${
                    navActive(path, item.href)
                      ? "bg-accent/15 text-accent-light"
                      : "text-slate-400"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4">
              <button
                type="button"
                onClick={logout}
                className="w-full rounded-lg border border-white/10 py-2 text-sm"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-surface-border bg-white/80 px-4 py-4 backdrop-blur-md safe-top sm:px-6 md:px-8">
          <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
            <button
              type="button"
              className="btn-secondary min-h-[44px] px-3"
              onClick={() => setMenuOpen(true)}
            >
              Menu
            </button>
            <span className="text-xs text-surface-muted">{user.displayName}</span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            {greetingLine}
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            {title ?? "Overview"}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-surface-muted">{subtitle}</p>
          ) : null}
          <p className="mt-2 text-xs text-slate-400">
            {roleLabel(user.role)} · {user.displayName}
          </p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 safe-bottom sm:px-6 sm:py-6 md:px-8">
          {pathAllowed ? (
            children
          ) : (
            <div className="card max-w-lg">
              <h3 className="text-xl font-bold text-ink-900">
                This view is not in your portal
              </h3>
              <p className="mt-2 text-sm text-surface-muted">
                Your {roleLabel(user.role).toLowerCase()} only includes the
                pages listed in the sidebar.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-accent hover:text-accent-dark"
              >
                Back to overview →
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
