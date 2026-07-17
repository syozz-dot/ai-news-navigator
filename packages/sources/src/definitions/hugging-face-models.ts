import { createHuggingFaceModelAdapter } from "../hugging-face-model-adapter.js";
import type { SourceDefinition } from "../types.js";

export const huggingFaceModelsSource = {
  key: "hugging-face-models",
  name: "Hugging Face Model Radar",
  type: "other",
  reliability: "high",
  connectorKey: "hugging-face:trending-models",
  homepageUrl: "https://huggingface.co/models",
  language: "en",
  isFirstParty: false,
  allowFullText: false,
  fetchIntervalMinutes: 7 * 24 * 60,
} satisfies SourceDefinition;

export function createHuggingFaceModelsAdapter(fetchImpl?: typeof fetch) {
  return createHuggingFaceModelAdapter(huggingFaceModelsSource, fetchImpl);
}
