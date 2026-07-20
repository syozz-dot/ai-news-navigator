import { HuggingFaceDailyPapersAdapter } from "../hugging-face-daily-papers-adapter.js";
import type { SourceDefinition } from "../types.js";

export const huggingFaceDailyPapersSource = {
  key: "hugging-face-daily-papers",
  name: "Hugging Face Daily Papers",
  type: "other",
  reliability: "high",
  connectorKey: "hugging-face:daily-papers",
  homepageUrl: "https://huggingface.co/papers",
  language: "en",
  isFirstParty: false,
  allowFullText: false,
  fetchIntervalMinutes: 24 * 60,
} satisfies SourceDefinition;

export function createHuggingFaceDailyPapersAdapter(fetchImpl?: typeof fetch) {
  return new HuggingFaceDailyPapersAdapter({
    definition: huggingFaceDailyPapersSource,
    maxItems: 15,
    candidateLimit: 50,
    ...(fetchImpl ? { fetchImpl } : {}),
  });
}
