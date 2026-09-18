"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";

const ACCOUNTS = [
  { role: "Manager portal", who: "Faisal", email: "manager@techlio.local", password: "manager123" },
  { role: "Developer portal", who: "Alex", email: "developer@techlio.local", password: "developer123" },
  { role: "Developer portal", who: "Sam", email: "sam@techlio.local", password: "developer123" },
  { role: "Admin portal", who: "Mahsam", email: "admin@techlio.local", password: "admin123" },
  { role: "Auditor portal", who: "Priya", email: "auditor@techlio.local", password: "auditor123" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("manager@techlio.local");
  const [password, setPassword] = useState("manager123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface-canvas lg:flex-row">
      <section className="relative flex flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-ink-950 via-ink-900 to-ink-800 p-8 text-slate-100 sm:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(45,212,191,0.2),transparent_45%),radial-gradient(circle_at_85%_75%,rgba(56,189,248,0.12),transparent_40%)]" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent font-bold text-white">
              T
            </div>
            <span className="text-sm font-semibold text-white">Techlio</span>
          </div>
          <h1 className="mt-8 max-w-md text-4xl font-bold leading-tight text-white sm:text-5xl">
            See what the agent performed.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Personal portals for managers, developers, auditors, and admins —
            JWT-secured, role-scoped, metadata only.
          </p>
        </div>
        <ul className="relative mt-10 space-y-2 text-sm text-slate-400">
          <li>Teal signals for live activity</li>
          <li>Coverage gaps, not silent zeros</li>
          <li>No timesheet conclusions</li>
        </ul>
      </section>

      <section className="flex w-full max-w-md flex-col justify-center p-6 sm:p-10 lg:min-h-[100dvh] lg:max-w-lg">
        <h2 className="text-2xl font-bold text-ink-900">Sign in</h2>
        <p className="mt-1 text-sm text-surface-muted">Local MVP accounts</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-ink-800">
            Email
            <input
              className="mt-1 min-h-[44px] w-full rounded-lg border border-surface-border bg-white px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink-800">
            Password
            <input
              className="mt-1 min-h-[44px] w-full rounded-lg border border-surface-border bg-white px-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button type="submit" disabled={busy} className="btn-primary w-full min-h-[44px]">
            {busy ? "Signing in…" : "Continue"}
          </button>
        </form>
        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Demo portals
          </p>
          <ul className="mt-3 space-y-2">
            {ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-surface-border bg-white px-3 py-2.5 text-left text-sm transition hover:border-accent/40 hover:shadow-sm"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                  }}
                >
                  <span className="font-semibold text-ink-900">
                    {a.who} · {a.role}
                  </span>
                  <span className="mt-0.5 block text-xs text-surface-muted">
                    {a.email}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
