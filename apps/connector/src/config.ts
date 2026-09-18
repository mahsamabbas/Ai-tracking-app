export const config = {
  port: Number(process.env.CONNECTOR_PORT ?? 9477),
  apiBaseUrl: process.env.TECHLIO_API_URL ?? "http://localhost:3001",
  organizationId:
    process.env.TECHLIO_ORG_ID ?? "550e8400-e29b-41d4-a716-446655440010",
  developerId:
    process.env.TECHLIO_DEV_ID ?? "550e8400-e29b-41d4-a716-446655440011",
  deviceId:
    process.env.TECHLIO_DEVICE_ID ?? "550e8400-e29b-41d4-a716-446655440012",
  consentVersion: process.env.TECHLIO_CONSENT_VERSION ?? "1",
  connectorVersion: "0.1.0",
  /** Host agent. Cursor is the local IDE; override with TECHLIO_PROVIDER. */
  provider: process.env.TECHLIO_PROVIDER ?? "cursor",
  dbPath: process.env.CONNECTOR_DB ?? ".techlio-connector/queue.db",
  signingKeyHex: process.env.CONNECTOR_SIGNING_KEY_HEX,
  deviceToken: process.env.TECHLIO_DEVICE_TOKEN ?? "dev-device-token",
};
