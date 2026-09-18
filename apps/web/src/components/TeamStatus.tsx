import type { TeamPayload } from "@/app/page";

export function TeamStatus({ data }: { data: TeamPayload }) {
  return (
    <section>
      <h2>Team status</h2>
      <p>Connectors: {data.connectors.length}</p>
      <p>Recent events (last hour signals): {data.recentEvents.length}</p>
      <ul>
        {data.recentEvents.slice(0, 10).map((e, i) => (
          <li key={i}>
            <code>{JSON.stringify(e).slice(0, 120)}…</code>
          </li>
        ))}
      </ul>
    </section>
  );
}
