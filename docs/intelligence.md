# Relevance and story clustering

## Boundary

The first intelligence stage is deterministic and provider-neutral. It does not ask an LLM to decide what is true or silently merge events.

Raw items remain unchanged. Every relevance decision is stored in `item_assessments` with the scorer version, component scores, matched signals, reasons, and timestamp. Changing the scorer version allows all existing items to be reassessed without deleting source evidence.

## Relevance model

`deterministic-v1` produces separate scores for:

- AI centrality: model families, AI companies, agents, reasoning, multimodal systems, inference, RAG, embeddings, training, and related technical signals.
- Product impact: launches, APIs, pricing, open source, enterprise use, benchmarks, policy, performance, integrations, and business events.
- Content prior: a small type-specific prior for official news, product pages, and releases. Papers receive no automatic product prior.

The final score is transparent:

```text
0.65 * AI centrality
+ 0.30 * product impact
+ content-type prior
```

An item must have meaningful AI centrality and pass its content-type threshold. Low-scoring items are retained and marked processed, but they do not create public Stories.

## Story clustering

`lexical-v1` compares relevant items with active Stories inside a 72-hour window. It combines:

- title token overlap;
- title character similarity;
- shared company, model, or repository identifiers;
- publication-time proximity;
- a penalty when headlines describe different actions such as pricing versus launch.

Hard guards reject incompatible paper/non-paper pairs, different repositories, and conflicting release versions. Papers use a substantially higher threshold because related research is not necessarily the same event.

When no candidate passes the threshold, the item creates a new `emerging` Story. A matched item becomes supporting evidence. A Story becomes `confirmed` only after it contains items from at least two independent sources.

Each `story_items` assignment records similarity, clustering version, and match reasons.

The processing command holds an expiring global PostgreSQL job lease. This keeps two scheduler instances from creating parallel Story decisions while still recovering automatically after a crashed worker.

## Chinese Story analysis

Story interpretation runs as a separate evidence-bound generation stage after
deterministic scoring and clustering:

- Vercel AI Gateway uses deployment OIDC, so production does not need a
  long-lived model-provider API key.
- Original titles, URLs, excerpts, and evidence records remain unchanged.
- Each analysis stores a Chinese display title, factual summary, significance,
  underlying logic, product impact, opportunities, open questions, confidence,
  model provenance, and the evidence item IDs used.
- A Story is regenerated when its evidence changes or a new prompt version is
  introduced.
- Missing evidence produces empty fields or open questions instead of unsupported
  conclusions.

## Current limitations

- This stage is conservative lexical clustering, not embedding-based semantic clustering.
- Original Story titles currently come from the first relevant item; generated
  Chinese display titles are stored separately.
- There is no automatic merge/split review queue yet.
- Relevance signals are English-first, although title tokenization includes Chinese character bigrams.

These constraints are deliberate. The next clustering version can add embeddings and human review while retaining the versioned baseline for comparison.
