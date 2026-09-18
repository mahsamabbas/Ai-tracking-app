import { providerLabel } from "@/lib/providers";

/**
 * Shown when the connector is alive but only heartbeats (or no agent events) are stored.
 * Using Cursor chat alone does not emit events — companion + hooks are required.
 */
export function AgentCollectionBanner({
  provider,
  heartbeatOnly,
}: {
  provider?: string;
  heartbeatOnly: boolean;
}) {
  if (!heartbeatOnly) return null;

  const label = providerLabel(provider);

  return (
    <div className="mb-6 rounded-xl border border-teal-200/60 bg-teal-50/50 px-4 py-4 sm:px-5">
      <p className="text-sm font-semibold text-slate-900">
        Connector sees {label} — no agent interactions in the feed yet
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        This is expected if you only used Cursor chat: the dashboard does not
        read Cursor&apos;s agent transcript. It records allowlisted metadata from
        the local connector and IDE companion.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
        <li>
          Install and enable{" "}
          <strong className="font-medium text-slate-800">
            Techlio AI Activity Companion
          </strong>{" "}
          in Cursor (<code className="rounded bg-white px-1 text-xs">apps/extension</code>
          — run <code className="rounded bg-white px-1 text-xs">pnpm --filter techlio-activity-companion build</code>, then
          &quot;Install from VSIX&quot; or launch the extension host).
        </li>
        <li>
          Save a file or run a task — the companion emits{" "}
          <code className="text-xs">file_modified</code>,{" "}
          <code className="text-xs">session_started</code>, and test/build events.
        </li>
        <li>
          {label === "Cursor"
            ? "Hourly model/tool duration from Cursor is Tier B (not in local MVP). File and session signals still appear when the companion is active."
            : "Model/tool timing needs a Tier A provider hook (e.g. Claude Code)."}
        </li>
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        Heartbeats in the list mean the connector is running — they are not agent
        work. Empty charts mean no observed interactions, not zero activity.
      </p>
    </div>
  );
}
