"use client";

import { ConnectorInstallGuide } from "@/components/domain/ConnectorInstallGuide";
import { fetchConnectorHealth, useConnectorSetupPhase } from "@/lib/connector-local";
import { developerNeedsLocalConnector } from "@/lib/connector-setup";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const PUBLIC_PATHS = ["/login"];
const SKIP_PATHS = ["/setup-connector"];

export function ConnectorRuntimeGuard() {
  const { token, ready, locked, user } = useAuth();
  const pathname = usePathname();
  const [online, setOnline] = useState<boolean | null>(null);

  const probe = useCallback(async () => {
    setOnline(await fetchConnectorHealth());
  }, []);

  const { phase } = useConnectorSetupPhase(6_000);
  const showForRole =
    (user?.role === "administrator" || user?.role === "manager") &&
    !developerNeedsLocalConnector(user?.role, user?.developerId);
  const developerOnboarding =
    developerNeedsLocalConnector(user?.role, user?.developerId) && phase !== "ready";

  useEffect(() => {
    if (
      !ready ||
      !token ||
      locked ||
      !showForRole ||
      developerOnboarding ||
      PUBLIC_PATHS.includes(pathname) ||
      SKIP_PATHS.includes(pathname)
    ) {
      setOnline(null);
      return;
    }
    void probe();
    const ms = online === false ? 4_000 : 20_000;
    const t = setInterval(() => void probe(), ms);
    return () => clearInterval(t);
  }, [ready, token, locked, pathname, probe, online, showForRole, developerOnboarding]);

  if (online !== false) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-500/40 bg-amber-50 px-4 py-3 text-amber-950 shadow-lg dark:border-amber-400/30 dark:bg-amber-950/95 dark:text-amber-50"
      role="status"
    >
      <ConnectorInstallGuide compact />
    </div>
  );
}
