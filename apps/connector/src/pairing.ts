import {
  saveIdentity,
  type ConnectorIdentity,
} from "./identity.js";

/** Bind this machine to an admin-issued device id + token. Does not create credentials. */
export async function claimFromPortal(input: {
  accessToken: string;
  deviceId: string;
  deviceToken: string;
  displayName?: string;
  apiBaseUrl?: string;
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

  const act = await fetch(`${api}/v1/connectors/activate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      deviceId: input.deviceId,
      token: input.deviceToken,
    }),
  });
  if (act.status === 401) throw new Error("invalid_connector_key");
  if (act.status === 403) throw new Error("not_your_key");
  if (!act.ok) throw new Error("activate_failed");
  const cred = (await act.json()) as {
    deviceId?: string;
    developerId?: string;
    organizationId?: string;
    provider?: string | null;
    label?: string | null;
  };
  if (!cred.deviceId || !cred.developerId || !cred.organizationId) {
    throw new Error("activate_failed");
  }

  const identity: ConnectorIdentity = {
    organizationId: cred.organizationId,
    developerId: cred.developerId,
    deviceId: cred.deviceId,
    deviceToken: input.deviceToken,
    apiBaseUrl: api,
    displayName: input.displayName ?? user.displayName ?? "Developer",
    claimedAt: new Date().toISOString(),
    provider: cred.provider ?? "cursor",
    label: cred.label ?? undefined,
    providers: cred.provider ? [cred.provider] : ["cursor"],
  };
  saveIdentity(identity);
  return identity;
}
