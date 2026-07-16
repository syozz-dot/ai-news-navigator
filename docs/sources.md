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

## Adapter behavior

The generic RSS adapter supports RSS 2.0 and Atom entry shapes. It:

- preserves valid source publication timestamps with `exact` confidence;
- leaves missing or invalid publication timestamps unknown rather than replacing them with fetch time;
- filters incrementally only when a valid source timestamp exists;
- strips markup from descriptions used as excerpts;
- makes full-content storage an explicit per-source choice;
- fails loudly on HTTP errors so source health can become degraded.
