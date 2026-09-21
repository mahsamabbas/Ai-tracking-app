import {
  saveIdentity,
  type ConnectorIdentity,
} from "./identity.js";

export async function claimFromPortal(input: {
  accessToken: string;
  developerId?: string;
  displayName?: string;
  apiBaseUrl?: string;
  provider?: string;
  label?: string;
}): Promise<ConnectorIdentity> {
  const api = (input.apiBaseUrl ?? "http://localhost:3001").replace(/\/$/, "");
  const meRes = await fetch(`${api}/v1/auth/me`, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });
  if (!meRes.ok) {
    throw new Error("not_signed_in");
  }
  const meJson = (await meRes.json()) as {
    user?: {
      displayName?: string;
      developerId?: string;
      organizationId?: string;
    };
  };
  const user = meJson.user;
  if (!user?.organizationId) {
    throw new Error("not_signed_in");
  }
  const developerId = input.developerId ?? user.developerId;
  if (!developerId) {
    throw new Error("developer_required");
  }
  const provider = input.provider ?? "cursor";
  const label = input.label?.trim() || undefined;
  const reg = await fetch(`${api}/v1/connectors/register`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ developerId, provider, label }),
  });
  if (!reg.ok) {
    throw new Error("register_failed");
  }
  const cred = (await reg.json()) as { deviceId?: string; token?: string };
  if (!cred.deviceId || !cred.token) {
    throw new Error("register_failed");
  }
  const identity: ConnectorIdentity = {
    organizationId: user.organizationId,
    developerId,
    deviceId: cred.deviceId,
    deviceToken: cred.token,
    apiBaseUrl: api,
    displayName: input.displayName ?? user.displayName ?? "Developer",
    claimedAt: new Date().toISOString(),
    provider,
    label,
    providers: [provider],
  };
  saveIdentity(identity);
  return identity;
}
