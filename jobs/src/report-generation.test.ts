import { describe, expect, it } from "vitest";

import { reportPeriodUtils } from "./report-generation.js";

describe("report period utilities", () => {
  it("builds Shanghai daily, ISO weekly and monthly periods", () => {
    const now = new Date("2026-07-19T12:00:00Z");

    expect(reportPeriodUtils.currentPeriod("daily", now).key).toBe(
      "2026-07-19",
    );
    expect(reportPeriodUtils.currentPeriod("weekly", now).key).toBe("2026-W29");
    expect(reportPeriodUtils.currentPeriod("monthly", now).key).toBe("2026-07");
  });

  it("selects the previous completed weekly and monthly periods", () => {
    const monday = new Date("2026-07-20T01:15:00Z");
    const firstOfMonth = new Date("2026-07-01T01:15:00Z");

    expect(reportPeriodUtils.previousClosedPeriod("weekly", monday).key).toBe(
      "2026-W29",
    );
    expect(
      reportPeriodUtils.previousClosedPeriod("monthly", firstOfMonth).key,
    ).toBe("2026-06");
  });

  it("resolves ISO week boundaries across years", () => {
    const period = reportPeriodUtils.periodFromKey("weekly", "2026-W01");

    expect(period.start.toISOString()).toBe("2025-12-28T16:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-01-04T16:00:00.000Z");
  });
});
