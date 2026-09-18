import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import type { AuthUser, Role } from "./roles.js";
import { DEV_DEVELOPER, DEV_ORG } from "../constants.js";

export function userFromRequest(req: FastifyRequest): AuthUser {
  const role = (req.headers["x-role"] as string | undefined) ?? "manager";
  const org =
    (req.headers["x-org-id"] as string | undefined) ?? DEV_ORG;
  if (org !== DEV_ORG && role !== "administrator") {
    throw new UnauthorizedException("organization_forbidden");
  }
  return {
    id: (req.headers["x-user-id"] as string) ?? "user-1",
    organizationId: org,
    role: role as Role,
    developerId: DEV_DEVELOPER,
  };
}

@Injectable()
export class DashboardAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const role = (req.headers["x-role"] as string | undefined) ?? "manager";
    if (!role) throw new UnauthorizedException();
    if (role === "developer" && !req.headers["x-developer-id"]) {
      /* dev stub allows default developer id */
    }
    return true;
  }
}

export function requireRoles(user: AuthUser, allowed: Role[]): void {
  if (!allowed.includes(user.role)) {
    throw new UnauthorizedException("role_forbidden");
  }
}
