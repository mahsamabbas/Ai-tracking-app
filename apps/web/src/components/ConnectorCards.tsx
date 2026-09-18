import type { ConnectorRow } from "@/lib/types";
import { formatTime } from "@/lib/analytics";

function isStale(last?: string) {
  if (!last) return true;
  const t = new Date(last).getTime();
  return Date.now() - t > 5 * 60 * 1000;
}

export function ConnectorCards({ connectors }: { connectors: ConnectorRow[] }) {
  if (connectors.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-800">Connectors</h3>
        <p className="mt-2 text-sm text-slate-500">
          Connector offline — no heartbeat recorded yet. Run{" "}
          <code className="rounded bg-slate-100 px-1">pnpm dev</code> and install
          the local connector.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {connectors.map((c, i) => {
        const id = c.deviceId ?? c.device_id ?? `device-${i}`;
        const last = c.lastHeartbeat ?? c.last_heartbeat;
        const stale = isStale(last);
        const paused = (c.paused ?? 0) > 0;
        return (
          <div key={id} className="card">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase text-slate-500">
                  Device
                </p>
                <p className="font-mono text-sm text-slate-800">{id.slice(0, 18)}…</p>
              </div>
              {paused ? (
                <span className="badge-warn">Paused</span>
              ) : stale ? (
                <span className="badge-error">Stale</span>
              ) : (
                <span className="badge-ok">Online</span>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Version</dt>
                <dd className="font-medium">{c.version ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Queue depth</dt>
                <dd className="font-medium tabular-nums">
                  {c.queueDepth ?? c.queue_depth ?? 0}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-slate-500">Last heartbeat</dt>
                <dd className="text-slate-700">{formatTime(last)}</dd>
              </div>
            </dl>
          </div>
        );
      })}
    </div>
  );
}
