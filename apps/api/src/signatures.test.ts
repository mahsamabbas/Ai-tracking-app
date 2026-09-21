import * as ed from "@noble/ed25519";
import { describe, expect, it } from "vitest";
import { verifyBatchSignature } from "./signatures.js";

describe("verifyBatchSignature", () => {
  it("accepts the exact signed batch and rejects tampering", async () => {
    const privateKey = ed.utils.randomPrivateKey();
    const publicKey = await ed.getPublicKeyAsync(privateKey);
    const body = JSON.stringify({ events: [{ event_id: "event-1" }] });
    const signature = Buffer.from(
      await ed.signAsync(new TextEncoder().encode(body), privateKey),
    ).toString("base64");

    await expect(
      verifyBatchSignature({
        publicKey: Buffer.from(publicKey).toString("base64"),
        signature,
        body,
      }),
    ).resolves.toBe(true);

    await expect(
      verifyBatchSignature({
        publicKey: Buffer.from(publicKey).toString("base64"),
        signature,
        body: JSON.stringify({ events: [{ event_id: "event-2" }] }),
      }),
    ).resolves.toBe(false);
  });
});
