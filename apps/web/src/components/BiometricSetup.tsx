"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  biometricLabel,
  canUsePlatformBiometrics,
  dismissBiometricPrompt,
  enrollPlatformBiometrics,
  isMobileDevice,
  loadEnrollment,
  wasBiometricPromptDismissed,
} from "@/lib/biometric";
import { Callout } from "@/components/ui/Callout";

export function BiometricSetup() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user || !isMobileDevice() || loadEnrollment() || wasBiometricPromptDismissed()) {
        return;
      }
      const available = await canUsePlatformBiometrics();
      if (!cancelled && available) setVisible(true);
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!visible || !user) return null;

  const label = biometricLabel();

  async function enable() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await enrollPlatformBiometrics(user);
      setVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not enable biometric login");
      setBusy(false);
    }
  }

  return (
    <div className="mb-5 lg:hidden">
      <Callout
        tone="info"
        title={`Use ${label} the next time you sign in`}
        action={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-ghost h-8 text-xs"
              disabled={busy}
              onClick={() => {
                dismissBiometricPrompt();
                setVisible(false);
              }}
            >
              Not now
            </button>
            <button type="button" className="btn-primary h-8 text-xs" disabled={busy} onClick={() => void enable()}>
              {busy ? "Waiting…" : `Enable ${label}`}
            </button>
          </div>
        }
      >
        Available on this phone only. After you sign out, {label} unlocks the saved session on this
        device — it does not replace your password on a new device.
        {error ? <span className="mt-1 block">{error}</span> : null}
      </Callout>
    </div>
  );
}
