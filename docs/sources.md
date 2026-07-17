# Sources

Source definitions are code-reviewed configuration. Each definition records provenance, reliability, copyright policy, fetch frequency, and the connector used to retrieve it.

## Current sources

### OpenAI News

- Homepage: <https://openai.com/news/>
- Feed: <https://openai.com/news/rss.xml>
- Classification: first-party official blog, primary reliability
- Connector: RSS 2.0
- Schedule target: every 30 minutes
- Content policy: store titles, descriptions, links, categories, and source timestamps; do not store full article content

The first run accepts at most 50 of the newest feed entries. Later runs use a 24-hour overlap around the previous successful run and rely on exact URL/external-ID deduplication. The overlap prevents delayed or backfilled feed entries from being skipped.

### arXiv AI

- Homepage: <https://arxiv.org/>
- API: <https://export.arxiv.org/api/query>
- Query: `cs.AI OR cs.CL OR cs.LG`, newest submissions first
- Classification: primary paper repository
- Schedule target: every 60 minutes
- Content policy: store paper metadata and abstract; do not fetch or store PDF full text

The adapter distinguishes the original `published` timestamp from `updated`, preserves all authors and categories in metadata, and exposes the PDF as evidence metadata. It can retrieve up to five 100-entry pages, waiting three seconds between API requests, and stops once it crosses the previous-run checkpoint.

### Product Hunt

- Homepage: <https://www.producthunt.com/>
- Feed: <https://www.producthunt.com/feed>
- Classification: product launch directory, high reliability for launch metadata
- Connector: Atom
- Schedule target: every 60 minutes
- Content policy: store product name, tagline, Product Hunt link, maker name, and launch timestamp; do not store full page content

Product Hunt entries are stored as `product`, not as news or releases. The feed represents maker-submitted launch information, so product claims remain attributed to Product Hunt and are not treated as independently verified facts. The relevance scorer keeps AI products and filters unrelated launches.

### GitHub releases

Configured repositories:

- [Ollama](https://github.com/ollama/ollama/releases) — [Atom feed](https://github.com/ollama/ollama/releases.atom)
- [vLLM](https://github.com/vllm-project/vllm/releases) — [Atom feed](https://github.com/vllm-project/vllm/releases.atom)

These are first-party project release records. RC, alpha, beta, preview, and pre-release tags are filtered out by default. GitHub's Atom feed supplies `updated` rather than a dedicated publication field, so the timestamp is explicitly stored with `inferred` confidence.

## Adapter behavior

The generic RSS adapter supports RSS 2.0 and Atom entry shapes. It:

- preserves valid source publication timestamps with `exact` confidence;
- leaves missing or invalid publication timestamps unknown rather than replacing them with fetch time;
- filters incrementally only when a valid source timestamp exists;
- strips markup from descriptions used as excerpts;
- can derive a bounded excerpt from Atom content for release feeds;
- makes full-content storage an explicit per-source choice;
- fails loudly on HTTP errors so source health can become degraded.
