"use client";

import { CONNECTOR_LOCAL } from "./connector-local";

/** Routes developers may use until the local agent is installed and paired. */
export const CONNECTOR_ONBOARDING_PATHS = [
  "/setup-connector",
  "/my-connectors",
  "/policy",
] as const;

export type ConnectorSetupPhase = "loading" | "offline" | "unpaired" | "ready";

export function developerNeedsLocalConnector(
  role?: string | null,
  developerId?: string | null,
): boolean {
  return role === "developer" && Boolean(developerId);
}

export function isConnectorOnboardingPath(pathname: string): boolean {
  return CONNECTOR_ONBOARDING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function fetchConnectorSetupPhase(): Promise<
  Exclude<ConnectorSetupPhase, "loading">
> {
  try {
    const health = await fetch(`${CONNECTOR_LOCAL}/health`, { cache: "no-store" });
    if (!health.ok) return "offline";
    const r = await fetch(`${CONNECTOR_LOCAL}/identity`, { cache: "no-store" });
    if (!r.ok) return "offline";
    const json = (await r.json()) as { paired?: boolean };
    return json.paired ? "ready" : "unpaired";
  } catch {
    return "offline";
  }
}
