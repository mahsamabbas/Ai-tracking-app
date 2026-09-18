const MESSAGES: Record<string, string> = {
  no_activity: "No activity observed",
  connector_offline: "Connector offline",
  api_unavailable:
    "Backend or database unavailable — start Docker Desktop, then: docker compose up -d postgres redis",
  collection_paused: "Collection paused",
  provider_missing: "Provider does not expose this metric",
  events_delayed: "Events delayed",
  no_task_selected: "No task selected",
};

export function EmptyState({
  kind,
  detail,
}: {
  kind: string;
  detail?: string;
}) {
  return (
    <div
      role="status"
      style={{
        padding: 16,
        border: "1px solid #ccc",
        borderRadius: 8,
        background: "#fafafa",
      }}
    >
      <strong>{MESSAGES[kind] ?? kind}</strong>
      {detail ? (
        <p style={{ margin: "8px 0 0", color: "#555", fontSize: 14 }}>{detail}</p>
      ) : null}
    </div>
  );
}
