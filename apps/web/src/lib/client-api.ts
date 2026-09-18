import { API_BASE } from "./api";
import type { Role } from "./api";

export { API_BASE };
export type { Role };

export const DEV_ID = "550e8400-e29b-41d4-a716-446655440011";
export const DEVICE_ID = "550e8400-e29b-41d4-a716-446655440012";

export function streamUrl(): string {
  return `${API_BASE}/v1/stream/sse`;
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
  developerId = DEV_ID,
) {
  const { json } = await apiFetch("/v1/activity-exports", token, {
    method: "POST",
    body: JSON.stringify({ format, developerId }),
  });
  return json;
}
