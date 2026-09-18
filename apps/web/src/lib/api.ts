export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const DEV_ID = "550e8400-e29b-41d4-a716-446655440011";
export const DEVICE_ID = "550e8400-e29b-41d4-a716-446655440012";

export type Role = "manager" | "developer" | "administrator" | "auditor";

export {
  streamUrl,
  fetchTeamDashboard,
  fetchTimeline,
  fetchHourlySnapshot,
  createExport,
  downloadActivityExport,
} from "./client-api";
