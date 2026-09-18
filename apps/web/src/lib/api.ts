export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const DEV_ID = "550e8400-e29b-41d4-a716-446655440011";
export const DEVICE_ID = "550e8400-e29b-41d4-a716-446655440012";

export type Role = "manager" | "developer" | "administrator" | "auditor";

function headers(role: Role = "manager"): HeadersInit {
  return { "x-role": role };
}

export async function fetchTeamDashboard(filters?: {
  developerId?: string;
  eventType?: string;
  provider?: string;
  role?: Role;
}) {
  const params = new URLSearchParams();
  if (filters?.developerId) params.set("developerId", filters.developerId);
  if (filters?.eventType) params.set("eventType", filters.eventType);
  if (filters?.provider) params.set("provider", filters.provider);
  const qs = params.toString();
  const r = await fetch(
    `${API_BASE}/v1/dashboard/team${qs ? `?${qs}` : ""}`,
    { headers: headers(filters?.role ?? "manager") },
  );
  const json = await r.json();
  return { ok: r.ok, status: r.status, json };
}

export async function fetchTimeline(developerId: string) {
  const r = await fetch(`${API_BASE}/v1/developers/${developerId}/timeline`, {
    headers: headers("manager"),
  });
  return r.json();
}

export async function fetchHourlySnapshot(id: string) {
  const r = await fetch(`${API_BASE}/v1/hourly-snapshots/${id}`, {
    headers: headers("manager"),
  });
  return r.json();
}

export async function createExport(format: "csv" | "pdf" = "csv") {
  const r = await fetch(`${API_BASE}/v1/activity-exports`, {
    method: "POST",
    headers: { ...headers("manager"), "Content-Type": "application/json" },
    body: JSON.stringify({ format, developerId: DEV_ID }),
  });
  return r.json();
}

export function streamUrl(): string {
  return `${API_BASE}/v1/stream/sse`;
}
