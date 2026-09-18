"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview", desc: "Team & live signals" },
  { href: "/developer-day", label: "Developer day", desc: "Hourly timeline" },
  { href: "/connectors", label: "Connectors", desc: "Health & versions" },
  { href: "/audit", label: "Audit", desc: "Access & policy" },
];

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

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-slate-900 text-slate-100 md:flex md:flex-col">
        <div className="border-b border-slate-700 px-5 py-6">
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
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const active = path === item.href;
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
        <div className="border-t border-slate-700 p-4 text-xs text-slate-500">
          Refreshes every 30s on overview
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-6 py-5 md:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {title ?? "Overview"}
          </h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
          ) : null}
        </header>
        <main className="flex-1 px-6 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
