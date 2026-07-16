# AI News Navigator

AI News Navigator is an open-source AI industry intelligence product for product managers, founders, and researchers.

It is designed to answer three questions:

1. What actually happened?
2. Why does it matter?
3. What product or business opportunity could follow?

## Project status

V2 foundation work is in progress. The current milestone focuses on source reliability, normalized data, exact deduplication, and a provider-neutral intelligence pipeline before UI development begins.

## Architecture

```text
Source adapters
  -> Fetch
  -> Normalize
  -> Canonical URL and content hash
  -> Exact deduplication
  -> Store items
  -> Cluster stories
  -> Score and analyze
  -> Publish
```

The core domain separates raw source items from stories:

- `Source`: where information comes from and whether the connector is healthy.
- `Item`: one article, paper, release, post, or product page.
- `Story`: one real-world event supported by one or more items.
- `Topic`: a company, model, technology, or content category used for navigation.

See [docs/architecture.md](docs/architecture.md) for the current boundaries.

## Workspace

```text
apps/web             Public website and API (planned)
packages/database    PostgreSQL schema and database client
packages/sources     Source contracts and registry types
packages/pipeline    Normalization, exact deduplication, and ingestion
jobs                 Scheduled ingestion entry points
docs                 Product and engineering documentation
```

## Local development

Requirements:

- Node.js 22 or newer
- pnpm 11
- Docker, or an existing PostgreSQL instance

```bash
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm check
pnpm test
```

## Product principles

- Facts and AI interpretation are stored and presented separately.
- Original publication time is never replaced by crawl time.
- Every AI conclusion must link back to source evidence.
- Ranking is multi-signal; the LLM is not the sole ranking authority.
- A broken source must be visible in source health, not silently become an empty section.

## License

[MIT](LICENSE)
