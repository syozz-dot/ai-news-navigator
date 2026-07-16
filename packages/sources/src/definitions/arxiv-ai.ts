import { ArxivSourceAdapter } from "../arxiv-adapter.js";
import type { SourceDefinition } from "../types.js";

export const arxivAiSource = {
  key: "arxiv-ai",
  name: "arXiv AI",
  type: "arxiv",
  reliability: "primary",
  connectorKey: "arxiv:ai",
  homepageUrl: "https://arxiv.org/",
  feedUrl:
    "https://export.arxiv.org/api/query?search_query=cat%3Acs.AI%20OR%20cat%3Acs.CL%20OR%20cat%3Acs.LG",
  language: "en",
  isFirstParty: true,
  allowFullText: false,
  fetchIntervalMinutes: 60,
} satisfies SourceDefinition;

export function createArxivAiAdapter(
  fetchImpl?: typeof fetch,
): ArxivSourceAdapter {
  return new ArxivSourceAdapter({
    key: arxivAiSource.connectorKey,
    searchQuery: "cat:cs.AI OR cat:cs.CL OR cat:cs.LG",
    maxItems: 500,
    pageSize: 100,
    maxPages: 5,
    requestIntervalMs: 3_000,
    ...(fetchImpl ? { fetchImpl } : {}),
  });
}
