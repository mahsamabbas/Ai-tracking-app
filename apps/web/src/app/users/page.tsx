"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { createPortalUser, fetchUsers } from "@/lib/client-api";
import type { Role } from "@/lib/api";

type OrgUser = {
  id: string;
  email?: string;
  displayName: string;
  role: Role;
  developerId?: string | null;
};

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "developer" as Role,
  });

  async function load() {
    if (!token) return;
    const { ok, json } = await fetchUsers(token);
    if (!ok) {
      setError("Only administrators can manage users.");
      return;
    }
    setUsers(json.users ?? []);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const { ok, json } = await createPortalUser(token, form);
    if (!ok || json.error) {
      setError(json.error ?? "Could not create user");
      return;
    }
    setForm({ displayName: "", email: "", password: "", role: "developer" });
    await load();
  }

  return (
    <AppShell
      title="Users"
      subtitle="Organization membership and roles (administrator only)"
    >
      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      <section className="card mb-6">
        <h3 className="text-sm font-semibold text-ink-900">Register a user</h3>
        <p className="mt-1 text-xs text-slate-500">
          Developers are bound to their own activity. Managers see the team.
          Auditors are read-only.
        </p>
        <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={onCreate}>
          <input
            className="min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            placeholder="Display name"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            required
          />
          <input
            className="min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            placeholder="Temporary password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <select
            className="min-h-[40px] rounded-lg border border-slate-300 px-3 text-sm"
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as Role })
            }
          >
            <option value="developer">Developer</option>
            <option value="manager">Manager</option>
            <option value="administrator">Administrator</option>
            <option value="auditor">Auditor</option>
          </select>
          <button type="submit" className="btn-primary sm:col-span-2">
            Create user
          </button>
        </form>
      </section>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Developer id</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 font-medium">{u.displayName}</td>
                <td className="px-4 py-3 text-slate-600">{u.email ?? "—"}</td>
                <td className="px-4 py-3">{u.role}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {u.developerId ? `${u.developerId.slice(0, 8)}…` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
