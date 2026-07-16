import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const sourceTypeEnum = pgEnum("source_type", [
  "official_blog",
  "rss",
  "arxiv",
  "github",
  "product_hunt",
  "hacker_news",
  "media",
  "social",
  "other",
]);

export const sourceReliabilityEnum = pgEnum("source_reliability", [
  "primary",
  "high",
  "medium",
  "low",
]);

export const sourceStatusEnum = pgEnum("source_status", [
  "active",
  "degraded",
  "disabled",
]);

export const sourceRunStatusEnum = pgEnum("source_run_status", [
  "running",
  "succeeded",
  "partial",
  "failed",
]);

export const contentTypeEnum = pgEnum("content_type", [
  "news",
  "paper",
  "product",
  "release",
  "post",
  "other",
]);

export const publicationTimeConfidenceEnum = pgEnum(
  "publication_time_confidence",
  ["exact", "inferred", "unknown"],
);

export const itemStatusEnum = pgEnum("item_status", [
  "normalized",
  "processed",
  "failed",
  "ignored",
]);

export const storyStatusEnum = pgEnum("story_status", [
  "emerging",
  "confirmed",
  "cooling",
  "corrected",
  "archived",
]);

export const storyItemRoleEnum = pgEnum("story_item_role", [
  "primary",
  "supporting",
  "duplicate",
  "context",
]);

export const topicTypeEnum = pgEnum("topic_type", [
  "company",
  "model",
  "technology",
  "content_type",
  "person",
  "other",
]);

export const sources = pgTable(
  "sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 128 }).notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    type: sourceTypeEnum("type").notNull(),
    reliability: sourceReliabilityEnum("reliability")
      .default("medium")
      .notNull(),
    status: sourceStatusEnum("status").default("active").notNull(),
    language: varchar("language", { length: 16 }),
    homepageUrl: text("homepage_url"),
    feedUrl: text("feed_url"),
    connectorKey: varchar("connector_key", { length: 128 }).notNull(),
    fetchIntervalMinutes: integer("fetch_interval_minutes")
      .default(60)
      .notNull(),
    isFirstParty: boolean("is_first_party").default(false).notNull(),
    allowFullText: boolean("allow_full_text").default(false).notNull(),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").default(0).notNull(),
    leaseOwner: varchar("lease_owner", { length: 128 }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("sources_slug_unique").on(table.slug),
    index("sources_status_idx").on(table.status),
    index("sources_status_lease_idx").on(table.status, table.leaseExpiresAt),
    index("sources_connector_key_idx").on(table.connectorKey),
  ],
);

export const sourceRuns = pgTable(
  "source_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    status: sourceRunStatusEnum("status").default("running").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    fetchedCount: integer("fetched_count").default(0).notNull(),
    storedCount: integer("stored_count").default(0).notNull(),
    duplicateCount: integer("duplicate_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    errorMessage: text("error_message"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
  },
  (table) => [
    index("source_runs_source_started_idx").on(table.sourceId, table.startedAt),
    index("source_runs_status_idx").on(table.status),
  ],
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "restrict" }),
    externalId: varchar("external_id", { length: 512 }),
    contentType: contentTypeEnum("content_type").notNull(),
    status: itemStatusEnum("status").default("normalized").notNull(),
    title: text("title").notNull(),
    originalTitle: text("original_title"),
    excerpt: text("excerpt"),
    content: text("content"),
    author: varchar("author", { length: 256 }),
    language: varchar("language", { length: 16 }),
    originalUrl: text("original_url").notNull(),
    canonicalUrl: text("canonical_url").notNull(),
    canonicalUrlHash: varchar("canonical_url_hash", { length: 64 }).notNull(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    sourcePublishedAt: timestamp("source_published_at", { withTimezone: true }),
    publicationTimeConfidence: publicationTimeConfidenceEnum(
      "publication_time_confidence",
    )
      .default("unknown")
      .notNull(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    rawMetadata: jsonb("raw_metadata")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("items_canonical_url_hash_unique").on(table.canonicalUrlHash),
    uniqueIndex("items_source_external_id_unique").on(
      table.sourceId,
      table.externalId,
    ),
    index("items_source_published_idx").on(
      table.sourceId,
      table.sourcePublishedAt,
    ),
    index("items_content_type_published_idx").on(
      table.contentType,
      table.sourcePublishedAt,
    ),
    index("items_content_hash_idx").on(table.contentHash),
  ],
);

export const stories = pgTable(
  "stories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 256 }).notNull(),
    status: storyStatusEnum("status").default("emerging").notNull(),
    title: text("title").notNull(),
    factualSummary: text("factual_summary"),
    primaryItemId: uuid("primary_item_id").references(() => items.id, {
      onDelete: "set null",
    }),
    firstPublishedAt: timestamp("first_published_at", { withTimezone: true }),
    lastPublishedAt: timestamp("last_published_at", { withTimezone: true }),
    independentSourceCount: integer("independent_source_count")
      .default(1)
      .notNull(),
    freshnessScore: real("freshness_score"),
    evidenceScore: real("evidence_score"),
    relevanceScore: real("relevance_score"),
    overallScore: real("overall_score"),
    confidence: real("confidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stories_slug_unique").on(table.slug),
    index("stories_status_score_idx").on(table.status, table.overallScore),
    index("stories_first_published_idx").on(table.firstPublishedAt),
  ],
);

export const storyItems = pgTable(
  "story_items",
  {
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    role: storyItemRoleEnum("role").default("supporting").notNull(),
    similarity: real("similarity"),
    addedAt: timestamp("added_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("story_items_story_item_unique").on(
      table.storyId,
      table.itemId,
    ),
    index("story_items_item_idx").on(table.itemId),
  ],
);

export const topics = pgTable(
  "topics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 128 }).notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    type: topicTypeEnum("type").notNull(),
    description: text("description"),
    aliases: text("aliases").array().default([]).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("topics_slug_unique").on(table.slug),
    index("topics_type_active_idx").on(table.type, table.isActive),
  ],
);

export const storyTopics = pgTable(
  "story_topics",
  {
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    confidence: real("confidence"),
    assignedBy: varchar("assigned_by", { length: 64 })
      .default("system")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("story_topics_story_topic_unique").on(
      table.storyId,
      table.topicId,
    ),
    index("story_topics_topic_idx").on(table.topicId),
  ],
);

export const storyAnalyses = pgTable(
  "story_analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    storyId: uuid("story_id")
      .notNull()
      .references(() => stories.id, { onDelete: "cascade" }),
    factualSummary: text("factual_summary").notNull(),
    whyItMatters: text("why_it_matters"),
    underlyingLogic: text("underlying_logic"),
    productImpact: text("product_impact"),
    productOpportunities: jsonb("product_opportunities")
      .$type<string[]>()
      .default([])
      .notNull(),
    openQuestions: jsonb("open_questions")
      .$type<string[]>()
      .default([])
      .notNull(),
    evidenceItemIds: uuid("evidence_item_ids").array().default([]).notNull(),
    confidence: real("confidence").notNull(),
    provider: varchar("provider", { length: 64 }).notNull(),
    model: varchar("model", { length: 128 }).notNull(),
    promptVersion: varchar("prompt_version", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("story_analyses_story_created_idx").on(
      table.storyId,
      table.createdAt,
    ),
  ],
);

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type SourceRun = typeof sourceRuns.$inferSelect;
export type NewSourceRun = typeof sourceRuns.$inferInsert;
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
