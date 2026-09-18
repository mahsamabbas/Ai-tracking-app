export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const DEV_ID = "550e8400-e29b-41d4-a716-446655440011";
export const DEVICE_ID = "550e8400-e29b-41d4-a716-446655440012";

export async function fetchTeamDashboard() {
  const r = await fetch(`${API_BASE}/v1/dashboard/team`, {
    headers: { "x-role": "manager" },
  });
  const json = await r.json();
  return { ok: r.ok, status: r.status, json };
}
