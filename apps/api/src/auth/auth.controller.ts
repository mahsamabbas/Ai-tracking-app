import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { authenticatePortalUser, seedPortalUsers } from "@techlio/server-core";
import { signUserToken, verifyUserToken } from "./jwt.js";

@Controller("v1/auth")
export class AuthController {
  @Post("login")
  async login(@Body() body: { email?: string; password?: string }) {
    await seedPortalUsers();
    const email = body.email ?? "";
    const password = body.password ?? "";
    const user = await authenticatePortalUser(email, password);
    if (!user) throw new UnauthorizedException("invalid_credentials");
    const token = signUserToken({
      ...user,
      developerId: user.developerId ?? undefined,
    });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        organizationId: user.organizationId,
        developerId: user.developerId ?? null,
      },
      homePath:
        user.role === "developer"
          ? "/my-activity"
          : user.role === "auditor"
            ? "/audit"
            : user.role === "administrator"
              ? "/users"
              : "/",
    };
  }

  @Get("me")
  me(@Headers("authorization") auth?: string) {
    if (!auth?.startsWith("Bearer ")) throw new UnauthorizedException();
    return { user: verifyUserToken(auth.slice(7)) };
  }
}
