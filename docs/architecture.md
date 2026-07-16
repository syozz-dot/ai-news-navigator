# Architecture

## Boundary

AI News Navigator V2 begins with a modular monolith. The public product, database, source connectors, ingestion jobs, and intelligence modules share one repository while keeping explicit package boundaries.

The first milestone does not introduce queues or microservices. Those are deployment choices that can be added after source volume or processing latency proves they are needed.

## Core domain

### Source

A configured origin and connector. Source health is a first-class product concern.

The system records successful and failed runs, item counts, fetch frequency, reliability, copyright policy, and whether the source is first-party.

### Item

One original article, paper, release, product page, or post.

An item preserves five distinct concepts:

- Original URL and canonical URL
- Original publication time
- Discovery time
- Fetch time
- Processing time

`source_published_at` must never be overwritten with crawl time.

### Story

One real-world event supported by one or more items. Exact URL deduplication happens before semantic story clustering.

A story stores scores and a factual summary, while model-generated product analysis is versioned separately in `story_analyses`.

### Topic

A stable navigation concept such as a company, model, person, technology, or content type. Topic assignments include confidence and provenance.

## Ingestion contract

```text
SourceAdapter.fetch()
  -> RawSourceItem[]
  -> normalizeItem()
  -> canonical URL + hashes
  -> batch exact deduplication
  -> IngestionRepository.upsertItem()
  -> source run result
```

The ingestion package depends on interfaces rather than a concrete database implementation. This keeps source adapters and pipeline behavior testable without PostgreSQL.

## Intelligence boundary

Facts and interpretation remain separate:

- Items retain original source content and metadata.
- Stories retain the current factual synthesis and ranking signals.
- Story analyses retain model, provider, prompt version, evidence item IDs, confidence, product impact, and open questions.

No LLM provider is referenced by the domain model.

## Next architecture steps

1. Implement a PostgreSQL ingestion repository.
2. Add RSS, arXiv, and official-blog adapters.
3. Generate and apply the initial migration.
4. Add source health queries and retry policy.
5. Add semantic story clustering only after exact deduplication is stable.
