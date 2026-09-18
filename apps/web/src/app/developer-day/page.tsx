"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const DEV_ID = "550e8400-e29b-41d4-a716-446655440011";

export default function DeveloperDayPage() {
  const [cards, setCards] = useState<unknown[]>([]);

  useEffect(() => {
    fetch(`${API}/v1/developers/${DEV_ID}/timeline`, {
      headers: { "x-role": "manager" },
    })
      .then((r) => r.json())
      .then((j) => setCards(j.hourlyCards ?? []));
  }, []);

  if (cards.length === 0) {
    return <EmptyState kind="provider_missing" />;
  }

  return (
    <section>
      <h2>Developer day</h2>
      <pre>{JSON.stringify(cards, null, 2)}</pre>
    </section>
  );
}
