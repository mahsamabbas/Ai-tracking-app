import type { Role } from "./api";

export function homePathForRole(role?: Role | null): string {
  if (role === "developer") return "/my-activity";
  if (role === "auditor") return "/audit";
  if (role === "administrator") return "/users";
  return "/";
}

export function canExportActivity(role?: Role | null): boolean {
  return role === "manager" || role === "administrator";
}

export function canManageUsers(role?: Role | null): boolean {
  return role === "administrator";
}

export function canManageConnectors(role?: Role | null): boolean {
  return role === "administrator";
}

export function canViewTeam(role?: Role | null): boolean {
  return role === "manager" || role === "administrator";
}

export function canViewAudit(role?: Role | null): boolean {
  return role === "auditor" || role === "administrator";
}

export function canViewActivityCharts(role?: Role | null): boolean {
  return role !== "auditor";
}

export function portalScopeCopy(role?: Role | null): string {
  if (role === "developer") {
    return "You only see metadata collected about you — the same records managers can review.";
  }
  if (role === "administrator") {
    return "You configure users, connectors, and policy. Team activity is visible for operations.";
  }
  if (role === "auditor") {
    return "Read-only: access history, connector configuration, and retention — not developer timelines.";
  }
  return "You can review authorized team activity, hourly summaries, and connector alerts.";
}
