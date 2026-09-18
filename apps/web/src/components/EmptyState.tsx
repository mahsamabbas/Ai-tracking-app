const MESSAGES: Record<string, string> = {
  no_activity: "No activity observed",
  connector_offline: "Connector offline",
  collection_paused: "Collection paused",
  provider_missing: "Provider does not expose this metric",
  events_delayed: "Events delayed",
  no_task_selected: "No task selected",
};

export function EmptyState({ kind }: { kind: string }) {
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
    </div>
  );
}
