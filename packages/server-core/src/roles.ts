export type Role = "administrator" | "manager" | "developer" | "auditor";

export interface AuthUser {
  id: string;
  email?: string;
  displayName?: string;
  organizationId: string;
  role: Role;
  developerId?: string;
}

export function canViewDeveloper(user: AuthUser, developerId: string): boolean {
  if (user.role === "administrator" || user.role === "auditor") return true;
  if (user.role === "manager") return true;
  if (user.role === "developer") return user.developerId === developerId;
  return false;
}

export function navForRole(role: Role): string[] {
  if (role === "developer") {
    return ["/", "/my-activity", "/developer-day", "/policy"];
  }
  if (role === "auditor") {
    return ["/", "/audit", "/policy", "/connectors"];
  }
  if (role === "administrator") {
    return ["/", "/connectors", "/audit", "/policy", "/developer-day"];
  }
  return ["/", "/developer-day", "/connectors", "/policy", "/audit"];
}
