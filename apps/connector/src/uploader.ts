import type { ActivityEvent } from "@techlio/event-schema";
import { signBody } from "./signing.js";

export async function uploadBatch(
  apiBase: string,
  deviceToken: string,
  privateKey: Uint8Array,
  events: ActivityEvent[],
): Promise<boolean> {
  const body = JSON.stringify({ events });
  const signature = await signBody(privateKey, body);
  const res = await fetch(`${apiBase}/v1/events/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deviceToken}`,
      "X-Signature": signature,
      "X-Device-Id": events[0]?.device_id ?? "",
    },
    body,
  });
  return res.ok;
}
