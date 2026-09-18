export * from "./catalog.js";
export * from "./event.js";
export { zodToJsonSchema } from "zod-to-json-schema";
import { ActivityEventSchema } from "./event.js";
import { zodToJsonSchema } from "zod-to-json-schema";

export const activityEventJsonSchema = zodToJsonSchema(ActivityEventSchema, {
  name: "ActivityEvent",
});

/** Additive-only: bump schema_version and extend MetadataSchema; never remove fields in-place. */
export const EVOLUTION_RULES = `
- New event types may be added to the catalog.
- New optional metadata keys may be added with strict schema update.
- Breaking changes require a new schema_version and dual-read window.
`;
