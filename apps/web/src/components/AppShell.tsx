"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useMounted } from "@/lib/use-mounted";
import type { Role } from "@/lib/api";

const ALL_NAV = [
  { href: "/", label: "Overview", desc: "Live team signals", roles: ["manager", "administrator", "auditor", "developer"] as Role[] },
  { href: "/developer-day", label: "Developer day", desc: "Hourly timeline", roles: ["manager", "administrator", "developer"] as Role[] },
  { href: "/my-activity", label: "My activity", desc: "Your own signals", roles: ["developer"] as Role[] },
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
      <div className="flex h-[100dvh] items-center justify-center bg-[#f4f1ea] text-sm text-slate-500">
        Loading your portal…
      </div>
    );
  }

  if (path === "/login") {
    return <>{children}</>;
  }

  if (!user) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#f4f1ea] text-sm text-slate-500">
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

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f4f1ea]">
      <aside
        className="hidden h-full w-[272px] shrink-0 flex-col bg-[#16141f] text-slate-100 md:flex"
        aria-label="Main navigation"
      >
        <div className="shrink-0 px-5 py-7">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
            Techlio
          </p>
          <h1 className="mt-2 font-serif text-2xl leading-tight text-white">
            {roleLabel(user.role)}
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Agent visibility — not timekeeping
          </p>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
          {nav.map((item) => {
            const active = navActive(path, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-2xl px-3 py-2.5 transition ${
                  active
                    ? "bg-amber-200 text-slate-900"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="block text-sm font-medium">{item.label}</span>
                <span className={`block text-xs ${active ? "text-slate-700" : "text-slate-500"}`}>
                  {item.desc}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 text-sm font-semibold text-slate-900">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.displayName}</p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-xl border border-white/10 py-2 text-xs text-slate-300 hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(100%,280px)] flex-col bg-[#16141f] text-slate-100 shadow-xl">
            <div className="flex items-center justify-between px-4 py-4">
              <span className="font-serif text-lg">{roleLabel(user.role)}</span>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] text-2xl"
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-3 py-3 text-sm font-medium ${
                    navActive(path, item.href)
                      ? "bg-amber-200 text-slate-900"
                      : "text-slate-300"
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
                className="w-full rounded-xl border border-white/10 py-2 text-sm"
              >
                Sign out
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-[#e6dfd2] bg-[#faf7f2]/90 px-4 py-4 backdrop-blur safe-top sm:px-6 md:px-8">
          <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
            <button
              type="button"
              className="min-h-[44px] rounded-2xl border border-[#e6dfd2] bg-white px-3 text-sm font-medium"
              onClick={() => setMenuOpen(true)}
            >
              Menu
            </button>
            <span className="text-xs text-slate-500">{user.displayName}</span>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800/80">
            {greetingLine}
          </p>
          <h2 className="font-serif text-2xl tracking-tight text-slate-900 sm:text-3xl">
            {title ?? "Overview"}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          ) : null}
          <p className="mt-2 text-xs text-slate-500">
            {roleLabel(user.role)} · signed in as {user.displayName}
          </p>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 safe-bottom sm:px-6 sm:py-6 md:px-8">
          {pathAllowed ? (
            children
          ) : (
            <div className="card max-w-lg">
              <h3 className="font-serif text-xl text-slate-900">
                This view is not in your portal
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Your {roleLabel(user.role).toLowerCase()} only includes the
                pages listed in the sidebar. Permissions are encoded in your
                JWT and enforced by the API.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex min-h-[44px] items-center text-sm font-medium text-amber-800 hover:underline"
              >
                Back to overview
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
