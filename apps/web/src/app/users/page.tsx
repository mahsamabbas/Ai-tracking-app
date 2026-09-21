"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Callout } from "@/components/ui/Callout";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/States";
import { ConnectThisComputer } from "@/components/domain/ConnectThisComputer";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { apiPost } from "@/lib/api";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Role } from "@/lib/types";

interface OrgUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  organizationId: string;
  developerId?: string | null;
  hasConnector?: boolean;
}

const ROLE_TONE: Record<Role, "info" | "ok" | "neutral" | "warn"> = {
  administrator: "warn",
  manager: "info",
  developer: "ok",
  auditor: "neutral",
};

export default function UsersPage() {
  const { token } = useAuth();
  const query = useApi<{ users: OrgUser[] }>("/v1/users");
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
    role: "developer" as Role,
  });
  const [notice, setNotice] = useState<{ tone: "info" | "bad"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await apiPost<{ error?: string; user?: OrgUser }>("/v1/users", token, form);
      if (res.error) throw new Error(res.error.replace(/_/g, " "));
      const createdName = form.displayName;
      const role = form.role;
      setForm({ displayName: "", email: "", password: "", role: "developer" });
      setNotice({
        tone: "info",
        text:
          role === "developer"
            ? `${createdName} can sign in. They add Cursor or another tool from My connectors in their portal.`
            : `${createdName} can sign in. Only the Developer role is monitored; managers and admins use the dashboard without pairing a connector.`,
      });
      query.reload();
    } catch (err) {
      setNotice({
        tone: "bad",
        text: err instanceof Error ? err.message : "Could not create the user",
      });
    } finally {
      setBusy(false);
    }
  }

  const users = query.data?.users ?? [];

  return (
    <AppShell
      title="Access"
      subtitle="Dashboard logins, roles, and pairing this computer to a monitored person"
    >
      {notice ? (
        <div className="mb-5">
          <Callout tone={notice.tone} title={notice.text} />
        </div>
      ) : null}

      <section className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="card-pad">
          <p className="label">1. Dashboard login</p>
          <p className="mt-1.5 text-sm text-ink-700">
            A user account lets them open Techlio. It does not watch Cursor or any other tool.
          </p>
        </div>
        <div className="card-pad">
          <p className="label">2. Pair this computer</p>
          <p className="mt-1.5 text-sm text-ink-700">
            That person signs in and opens My connectors. They pick the AI tool and connect this
            computer themselves — you do not paste env vars for them.
          </p>
        </div>
        <div className="card-pad">
          <p className="label">3. IDE companion</p>
          <p className="mt-1.5 text-sm text-ink-700">
            Install the Techlio companion in Cursor or VS Code on that machine. Activity follows
            the paired person, not a .env file.
          </p>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader
            title="Add a user"
            subtitle="Developer = login. Pairing on their computer starts monitoring."
          />
          <CardBody>
            <form className="space-y-3" onSubmit={onCreate}>
              <label className="block">
                <span className="label mb-1 block">Display name</span>
                <input
                  className="field"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="label mb-1 block">Email</span>
                <input
                  className="field"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="label mb-1 block">Temporary password</span>
                <input
                  className="field"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
              </label>
              <label className="block">
                <span className="label mb-1 block">Role</span>
                <select
                  className="field"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                >
                  {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? "Creating…" : "Create user"}
              </button>
            </form>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Members" subtitle={`${users.length} in this organisation`} />
          {query.error ? (
            <ErrorState
              title="Could not load members"
              detail={
                query.status === 403
                  ? "Only administrators can manage organisation access."
                  : query.error
              }
              onRetry={query.reload}
            />
          ) : query.loading ? (
            <LoadingBlock rows={6} />
          ) : users.length === 0 ? (
            <EmptyState variant="no-results" />
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>This computer</th>
                    <th>Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="text-sm font-medium text-ink-900">{u.displayName}</td>
                      <td className="text-sm text-ink-500">{u.email}</td>
                      <td>
                        <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                      </td>
                      <td>
                        {u.developerId ? (
                          <ConnectThisComputer
                            developerId={u.developerId}
                            displayName={u.displayName}
                          />
                        ) : (
                          <span className="hint">Not monitored</span>
                        )}
                      </td>
                      <td>
                        {u.developerId ? (
                          <Link
                            href={`/employees/${u.developerId}`}
                            className="text-xs font-medium text-brand-600 hover:text-brand-700"
                          >
                            View analytics →
                          </Link>
                        ) : (
                          <span className="hint">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
