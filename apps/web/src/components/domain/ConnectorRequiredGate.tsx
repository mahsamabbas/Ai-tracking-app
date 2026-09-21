"use client";

import { LoadingBlock } from "@/components/ui/States";
import { useAuth } from "@/lib/auth-context";
import {
  developerNeedsLocalConnector,
  fetchConnectorSetupPhase,
  isConnectorOnboardingPath,
  type ConnectorSetupPhase,
} from "@/lib/connector-setup";
import { homePathForRole } from "@/lib/permissions";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

/**
 * Developers cannot use the dashboard until the local agent is running and paired.
 */
export function ConnectorRequiredGate({ children }: { children: React.ReactNode }) {
  const { token, user, ready, locked } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [phase, setPhase] = useState<ConnectorSetupPhase>("loading");

  const mustComplete = Boolean(
    token && !locked && developerNeedsLocalConnector(user?.role, user?.developerId),
  );

  const refresh = useCallback(async () => {
    if (!mustComplete) {
      setPhase("ready");
      return;
    }
    setPhase(await fetchConnectorSetupPhase());
  }, [mustComplete]);

  useEffect(() => {
    void refresh();
    if (!mustComplete) return;
    const ms = phase === "ready" ? 15_000 : 3_000;
    const t = setInterval(() => void refresh(), ms);
    return () => clearInterval(t);
  }, [mustComplete, refresh, phase]);

  useEffect(() => {
    if (!ready || !mustComplete || phase === "loading") return;

    if (phase === "ready") {
      if (pathname === "/setup-connector") {
        router.replace(homePathForRole(user?.role, user?.developerId));
      }
      return;
    }

    if (!isConnectorOnboardingPath(pathname)) {
      router.replace("/setup-connector");
    }
  }, [ready, mustComplete, phase, pathname, router, user?.role, user?.developerId]);

  if (!mustComplete) return children;

  if (phase === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock rows={3} />
      </div>
    );
  }

  if (phase !== "ready" && !isConnectorOnboardingPath(pathname)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoadingBlock rows={3} />
      </div>
    );
  }

  return children;
}
