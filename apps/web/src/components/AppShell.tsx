"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { RoleSwitcher } from "./RoleSwitcher";

const NAV = [
  { href: "/", label: "Overview", desc: "Team & live signals" },
  { href: "/developer-day", label: "Developer day", desc: "Hourly timeline" },
  { href: "/my-activity", label: "My activity", desc: "Developer self-view" },
  { href: "/connectors", label: "Connectors", desc: "Health & versions" },
  { href: "/policy", label: "Policy", desc: "Collection notice" },
  { href: "/audit", label: "Audit", desc: "Access & policy" },
];

function navActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className="hidden h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-100 md:flex"
        aria-label="Main navigation"
      >
        <div className="shrink-0 border-b border-slate-700 px-5 py-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
            Techlio
          </p>
          <h1 className="mt-1 text-lg font-semibold leading-tight">
            AI Activity
          </h1>
          <p className="mt-2 text-xs text-slate-400">
            Agent visibility — not timekeeping
          </p>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const active = navActive(path, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2.5 transition ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="block text-sm font-medium">{item.label}</span>
                <span
                  className={`block text-xs ${active ? "text-indigo-100" : "text-slate-500"}`}
                >
                  {item.desc}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="shrink-0 space-y-3 border-t border-slate-700 p-4">
          <RoleSwitcher dark />
          <p className="text-xs text-slate-500">SSE + 30s refresh on overview</p>
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal>
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside
            className="absolute left-0 top-0 flex h-full w-[min(100%,280px)] flex-col bg-slate-900 text-slate-100 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-700 px-4 py-4">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                className="min-h-[44px] min-w-[44px] rounded-lg text-2xl leading-none text-slate-300"
                onClick={() => setMenuOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-lg px-3 py-3 text-sm font-medium ${
                    navActive(path, item.href)
                      ? "bg-indigo-600 text-white"
                      : "text-slate-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-slate-700 p-4">
              <RoleSwitcher dark />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 safe-top sm:px-6 md:px-8">
          <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
            <button
              type="button"
              className="min-h-[44px] rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-800"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
            >
              Menu
            </button>
            <RoleSwitcher />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {title ?? "Overview"}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          ) : null}
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 safe-bottom sm:px-6 sm:py-6 md:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
