import type { Role } from "./types";

export function homePathForRole(role?: Role | null, developerId?: string | null): string {
  if (role === "developer") {
    return developerId ? `/employees/${developerId}` : "/";
  }
  if (role === "auditor") return "/audit";
  return "/";
}

export function canViewPeople(role?: Role | null): boolean {
  return role !== "auditor";
}

export function canViewTeam(role?: Role | null): boolean {
  return role === "manager" || role === "administrator";
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

export function canViewAudit(role?: Role | null): boolean {
  return role === "auditor" || role === "administrator";
}

export const ROLE_LABEL: Record<Role, string> = {
  manager: "Manager",
  administrator: "Administrator",
  developer: "Developer",
  auditor: "Security / auditor",
};

export const ROLE_SCOPE: Record<Role, string> = {
  manager:
    "Review authorised team activity, employee analytics, sessions, and connector coverage.",
  administrator:
    "Manage users, connectors, and policy, plus full organisation analytics.",
  developer:
    "See exactly the metadata collected about you — the same records managers can review.",
  auditor:
    "Read-only access history, connector configuration, and retention. Not individual timelines.",
};
