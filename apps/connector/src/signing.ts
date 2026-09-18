import * as ed from "@noble/ed25519";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const KEY_FILE = join(process.env.HOME ?? ".", ".techlio-connector", "signing.key");

export function loadOrCreateSigningKey(hexFromEnv?: string): Uint8Array {
  if (hexFromEnv) return Uint8Array.from(Buffer.from(hexFromEnv, "hex"));
  if (existsSync(KEY_FILE)) {
    return Uint8Array.from(readFileSync(KEY_FILE));
  }
  const dir = dirname(KEY_FILE);
  mkdirSync(dir, { recursive: true });
  const priv = ed.utils.randomPrivateKey();
  writeFileSync(KEY_FILE, Buffer.from(priv));
  return priv;
}

export async function signBody(
  privateKey: Uint8Array,
  body: string,
): Promise<string> {
  const sig = await ed.sign(new TextEncoder().encode(body), privateKey);
  return Buffer.from(sig).toString("base64");
}

export function newDeviceToken(): string {
  return randomBytes(32).toString("hex");
}
