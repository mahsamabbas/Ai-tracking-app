"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const DEVICE = "550e8400-e29b-41d4-a716-446655440012";

export default function ConnectorsPage() {
  const [health, setHealth] = useState<unknown>(null);

  useEffect(() => {
    fetch(`${API}/v1/connectors/${DEVICE}/health`).then((r) =>
      r.json().then(setHealth),
    );
  }, []);

  return (
    <section>
      <h2>Connector health</h2>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </section>
  );
}
