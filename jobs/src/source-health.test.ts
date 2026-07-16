import { describe, expect, it } from "vitest";

import {
  evaluateSourceHealth,
  type SourceHealthInput,
} from "./source-health.js";

const base: SourceHealthInput = {
  id: "source-1",
  slug: "source-1",
  name: "Source 1",
  status: "active",
  fetchIntervalMinutes: 60,
  lastSuccessAt: null,
  lastFailureAt: null,
  consecutiveFailures: 0,
  leaseOwner: null,
  leaseExpiresAt: null,
};

const now = new Date("2026-07-16T12:00:00Z");

describe("evaluateSourceHealth", () => {
  it("runs a newly configured source immediately", () => {
    expect(evaluateSourceHealth(base, now)).toMatchObject({
      operationalState: "never_run",
      isDue: true,
      isLeased: false,
      nextRunAt: null,
    });
  });

  it("schedules a healthy source from its last attempt", () => {
    const health = evaluateSourceHealth(
      { ...base, lastSuccessAt: new Date("2026-07-16T11:30:00Z") },
      now,
    );

    expect(health).toMatchObject({
      operationalState: "healthy",
      isDue: false,
      nextRunAt: new Date("2026-07-16T12:30:00Z"),
      retryDelayMinutes: 60,
    });
  });

  it("applies bounded exponential backoff after repeated failures", () => {
    const health = evaluateSourceHealth(
      {
        ...base,
        status: "degraded",
        lastFailureAt: new Date("2026-07-16T10:00:00Z"),
        consecutiveFailures: 3,
      },
      now,
    );

    expect(health).toMatchObject({
      operationalState: "failing",
      isDue: false,
      nextRunAt: new Date("2026-07-16T14:00:00Z"),
      retryDelayMinutes: 240,
    });
  });

  it("prevents a due source from running while its lease is active", () => {
    const health = evaluateSourceHealth(
      {
        ...base,
        lastSuccessAt: new Date("2026-07-16T09:00:00Z"),
        leaseOwner: "worker-1",
        leaseExpiresAt: new Date("2026-07-16T12:10:00Z"),
      },
      now,
    );

    expect(health).toMatchObject({
      operationalState: "stale",
      isDue: false,
      isLeased: true,
    });
  });

  it("never schedules a disabled source", () => {
    expect(
      evaluateSourceHealth({ ...base, status: "disabled" }, now),
    ).toMatchObject({
      operationalState: "disabled",
      isDue: false,
      nextRunAt: null,
    });
  });
});
