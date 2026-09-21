import { describe, expect, it } from "vitest";
import {
  connectorStateOf,
  emptyActivityVariant,
  rollupConnectorState,
} from "./connector-state.js";

describe("connectorStateOf", () => {
  it("is online only while a heartbeat is recent", () => {
    expect(connectorStateOf(0, new Date(), Date.now())).toBe("online");
    expect(
      connectorStateOf(0, new Date(Date.now() - 10 * 60 * 1000), Date.now()),
    ).toBe("stale");
    expect(connectorStateOf(0, null)).toBe("offline");
    expect(connectorStateOf(1, new Date())).toBe("paused");
  });
});

describe("rollupConnectorState", () => {
  it("stays online when one live tool is up even if another is offline", () => {
    expect(
      rollupConnectorState({
        paused: 0,
        lastHeartbeat: new Date(),
        anyOffline: true,
        anyStale: false,
        anyOnline: true,
        hasDevices: true,
      }),
    ).toBe("online");
  });

  it("is offline only when nothing is reporting", () => {
    expect(
      rollupConnectorState({
        paused: 0,
        lastHeartbeat: null,
        anyOffline: true,
        anyStale: false,
        anyOnline: false,
        hasDevices: true,
      }),
    ).toBe("offline");
  });
});

describe("emptyActivityVariant", () => {
  it("does not call a live Cursor collector offline because a demo Claude device exists", () => {
    expect(
      emptyActivityVariant([
        { state: "online", isDemo: false },
        { state: "offline", isDemo: true },
      ]),
    ).toBe("no-activity");
  });

  it("is connector-offline when nothing live has reported in", () => {
    expect(
      emptyActivityVariant([
        { state: "offline", isDemo: true },
        { state: "offline", isDemo: false },
      ]),
    ).toBe("connector-offline");
  });
});
