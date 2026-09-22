"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { ConnectorInstallGuide } from "@/components/domain/ConnectorInstallGuide";
import { ThisComputerStatus } from "@/components/domain/ConnectThisComputer";
import { Callout } from "@/components/ui/Callout";
import { useAuth } from "@/lib/auth-context";

export default function SetupConnectorPage() {
  const { user } = useAuth();

  if (user && user.role !== "developer") {
    return (
      <AppShell title="Connector setup">
        <Callout tone="info" title="For developers on their own computers">
          Administrators and managers issue keys on{" "}
          <Link href="/users" className="font-medium underline">Access</Link>. Send developers this
          page and the dashboard login link so they can install the local agent and activate their
          key.
        </Callout>
        <div className="mt-5">
          <ConnectorInstallGuide />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Required setup"
      subtitle="You must finish this on this computer before the dashboard is available"
    >
      <div className="mb-5 space-y-4" data-onboarding="onboard-welcome">
        <OnboardingStepper />
        <Callout tone="warn" title="Install the agent on this computer">
          Download the connector below, open it once, then activate your key on{" "}
          <strong>My connectors</strong>. You do not need the project repository.
        </Callout>
        <ThisComputerStatus />
        <ConnectorInstallGuide />
      </div>
      <Callout tone="info" title="Privacy">
        The agent records metadata about AI tool usage assigned to your key — not full prompts or
        keystrokes. You can pause collection from My connectors.
      </Callout>
    </AppShell>
  );
}
