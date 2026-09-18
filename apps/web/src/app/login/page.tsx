"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth-context";

const ACCOUNTS = [
  { role: "Manager portal", who: "Faisal", email: "manager@techlio.local", password: "manager123" },
  { role: "Developer portal", who: "Alex", email: "developer@techlio.local", password: "developer123" },
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
    <div className="flex min-h-[100dvh] flex-col bg-[#f4f1ea] lg:flex-row">
      <section className="relative flex flex-1 flex-col justify-between overflow-hidden bg-[#16141f] p-8 text-slate-100 sm:p-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.18),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(15,118,110,0.22),transparent_40%)]" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
            Techlio
          </p>
          <h1 className="mt-5 max-w-md font-serif text-4xl leading-tight text-white sm:text-5xl">
            Your portal. Your permissions.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300">
            Sign in to see what the agent performed — sessions, model calls,
            tools, tests, and coverage gaps. This is not timekeeping.
          </p>
        </div>
        <ul className="relative mt-10 space-y-3 text-sm text-slate-300">
          <li>Managers see the team</li>
          <li>Developers see only their own signals</li>
          <li>Auditors review access history</li>
          <li>Admins run connectors</li>
        </ul>
        <p className="relative mt-8 text-xs text-slate-500">
          JWT session · 12 hours · role encoded in the token
        </p>
      </section>

      <section className="flex w-full max-w-lg flex-col justify-center p-6 sm:p-10 lg:min-h-[100dvh]">
        <h2 className="font-serif text-3xl text-slate-900">Welcome back</h2>
        <p className="mt-1 text-sm text-slate-500">
          Local accounts for the MVP. Production will use SSO.
        </p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-1 min-h-[44px] w-full rounded-2xl border border-[#e6dfd2] bg-white px-3"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-1 min-h-[44px] w-full rounded-2xl border border-[#e6dfd2] bg-white px-3"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-rose-600">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="min-h-[44px] w-full rounded-2xl bg-[#16141f] font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Continue to your portal"}
          </button>
        </form>
        <div className="mt-8">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Demo portals
          </p>
          <ul className="mt-3 space-y-2">
            {ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  className="w-full rounded-2xl border border-[#e6dfd2] bg-white px-3 py-2.5 text-left text-sm hover:bg-[#faf7f2]"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(a.password);
                  }}
                >
                  <span className="font-medium text-slate-900">
                    {a.who} · {a.role}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
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
