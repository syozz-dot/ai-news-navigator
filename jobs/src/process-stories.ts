import "dotenv/config";

import { createDatabase } from "@ai-news-navigator/database";
import type { IngestionLogger } from "@ai-news-navigator/pipeline";

import { acquireJobLease, releaseJobLease } from "./job-lease.js";
import { createLeaseOwner } from "./source-executor.js";
import { PostgresStoryProcessor } from "./story-processing.js";

const logger: IngestionLogger = {
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
};

const { client, db } = createDatabase();
const processor = new PostgresStoryProcessor(db, logger);
const leaseOwner = createLeaseOwner();
const leaseKey = "story-processing";
const totals = {
  assessedCount: 0,
  relevantCount: 0,
  irrelevantCount: 0,
  storiesCreatedCount: 0,
  storiesMatchedCount: 0,
  skippedCount: 0,
  failedCount: 0,
};

try {
  const acquired = await acquireJobLease({
    db,
    key: leaseKey,
    owner: leaseOwner,
  });
  if (!acquired) {
    logger.info(
      "Story processing skipped because another worker owns the lease",
    );
  } else {
    try {
      for (let batch = 0; batch < 10; batch += 1) {
        const result = await processor.processBatch(100);
        for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
          totals[key] += result[key];
        }
        if (result.assessedCount + result.skippedCount === 0) break;
        if (
          result.assessedCount + result.skippedCount + result.failedCount <
          100
        ) {
          break;
        }
      }

      logger.info("Story processing finished", totals);
      if (totals.failedCount > 0) process.exitCode = 1;
    } finally {
      const released = await releaseJobLease({
        db,
        key: leaseKey,
        owner: leaseOwner,
      });
      if (!released) logger.warn("Story processing lease was no longer owned");
    }
  }
} finally {
  await client.end();
}
