import { API_BASE } from "./api";
import type { Role } from "./api";

export { API_BASE };
export type { Role };

export const DEV_ID = "550e8400-e29b-41d4-a716-446655440011";
export const DEVICE_ID = "550e8400-e29b-41d4-a716-446655440012";

export function streamUrl(token: string | null): string {
  const base = `${API_BASE}/v1/stream/sse`;
  if (!token) return base;
  return `${base}?access_token=${encodeURIComponent(token)}`;
}

export async function apiFetch(
  path: string,
  token: string | null,
  init?: RequestInit,
) {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const r = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, json };
}

export async function fetchTeamDashboard(
  token: string | null,
  filters?: {
    developerId?: string;
    eventType?: string;
    provider?: string;
  },
) {
  const params = new URLSearchParams();
  if (filters?.developerId) params.set("developerId", filters.developerId);
  if (filters?.eventType) params.set("eventType", filters.eventType);
  if (filters?.provider) params.set("provider", filters.provider);
  const qs = params.toString();
  return apiFetch(`/v1/dashboard/team${qs ? `?${qs}` : ""}`, token);
}

export async function fetchOrgDevelopers(token: string | null) {
  return apiFetch("/v1/org/developers", token);
}

export async function fetchUsers(token: string | null) {
  return apiFetch("/v1/users", token);
}

export async function createPortalUser(
  token: string | null,
  body: {
    email: string;
    password: string;
    displayName: string;
    role: Role;
    developerId?: string;
  },
) {
  return apiFetch("/v1/users", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchAuditLog(token: string | null) {
  return apiFetch("/v1/audit-log", token);
}

export async function fetchOrgPolicy(token: string | null) {
  return apiFetch("/v1/org/policy", token);
}

export async function pauseConnector(token: string | null, deviceId: string) {
  return apiFetch(`/v1/connectors/${deviceId}/pause`, token, { method: "POST" });
}

export async function resumeConnector(token: string | null, deviceId: string) {
  return apiFetch(`/v1/connectors/${deviceId}/resume`, token, {
    method: "POST",
  });
}

export async function registerConnector(
  token: string | null,
  developerId: string,
) {
  return apiFetch("/v1/connectors/register", token, {
    method: "POST",
    body: JSON.stringify({ developerId }),
  });
}

export async function revokeConnector(token: string | null, deviceId: string) {
  return apiFetch(`/v1/connectors/${deviceId}/revoke`, token, {
    method: "POST",
  });
}

export async function fetchTimeline(token: string | null, developerId: string) {
  const { json } = await apiFetch(
    `/v1/developers/${developerId}/timeline`,
    token,
  );
  return json;
}

export async function fetchHourlySnapshot(token: string | null, id: string) {
  const { json } = await apiFetch(`/v1/hourly-snapshots/${id}`, token);
  return json;
}

export async function createExport(
  token: string | null,
  format: "csv" | "pdf" = "csv",
  developerId?: string,
) {
  const { ok, status, json } = await apiFetch("/v1/activity-exports", token, {
    method: "POST",
    body: JSON.stringify({ format, developerId }),
  });
  if (!ok) {
    const msg =
      (json as { message?: string }).message ??
      `Export failed (${status})`;
    throw new Error(msg);
  }
  return json as { exportId?: string; downloadUrl?: string };
}

/** Downloads export with JWT — window.open cannot send Authorization. */
export async function downloadActivityExport(
  token: string | null,
  exportId: string,
  format: "csv" | "pdf",
): Promise<void> {
  if (!token) throw new Error("Sign in required");
  const r = await fetch(`${API_BASE}/v1/activity-exports/${exportId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? `Download failed (${r.status})`,
    );
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `techlio-activity-${exportId.slice(0, 8)}.${format === "csv" ? "csv" : "txt"}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
