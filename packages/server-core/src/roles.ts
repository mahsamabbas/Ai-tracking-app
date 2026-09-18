export type Role = "administrator" | "manager" | "developer" | "auditor";

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  organizationId: string;
  role: Role;
  developerId?: string;
}

/** Manager and admin may view any developer in their organization. */
export function canViewTeam(user: AuthUser): boolean {
  return user.role === "manager" || user.role === "administrator";
}

/**
 * Individual activity (events, hourly cards, drill-down).
 * Auditors review controls — not developer timelines (PRD §4, §12).
 */
export function canViewDeveloper(user: AuthUser, developerId: string): boolean {
  if (user.role === "administrator" || user.role === "manager") return true;
  if (user.role === "developer") return user.developerId === developerId;
  return false;
}

export function canViewConnectorHealth(user: AuthUser): boolean {
  return (
    user.role === "administrator" ||
    user.role === "manager" ||
    user.role === "auditor"
  );
}

export function canManageConnectors(user: AuthUser): boolean {
  return user.role === "administrator";
}

export function canRegisterConnector(
  user: AuthUser,
  developerId: string,
): boolean {
  if (user.role === "administrator") return true;
  if (user.role === "developer") return user.developerId === developerId;
  return false;
}

export function canPauseConnector(user: AuthUser, developerId: string): boolean {
  if (user.role === "administrator") return true;
  if (user.role === "developer") return user.developerId === developerId;
  return false;
}

export function canExportActivity(user: AuthUser): boolean {
  return user.role === "manager" || user.role === "administrator";
}

export function canViewAudit(user: AuthUser): boolean {
  return user.role === "auditor" || user.role === "administrator";
}

export function canManageUsers(user: AuthUser): boolean {
  return user.role === "administrator";
}

export function canViewActivityEvents(user: AuthUser): boolean {
  return user.role !== "auditor";
}

export function homePathForRole(role: Role): string {
  if (role === "developer") return "/my-activity";
  if (role === "auditor") return "/audit";
  if (role === "administrator") return "/users";
  return "/";
}

export function navForRole(role: Role): string[] {
  if (role === "developer") {
    return ["/", "/my-activity", "/developer-day", "/policy"];
  }
  if (role === "auditor") {
    return ["/audit", "/connectors", "/policy"];
  }
  if (role === "administrator") {
    return ["/", "/users", "/connectors", "/policy", "/audit"];
  }
  return ["/", "/developer-day", "/connectors", "/policy"];
}
