export type Role = "administrator" | "manager" | "developer" | "auditor";

export interface AuthUser {
  id: string;
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
