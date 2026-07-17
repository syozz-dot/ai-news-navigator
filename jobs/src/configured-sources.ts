import {
  arxivAiSource,
  createArxivAiAdapter,
  createHuggingFaceModelsAdapter,
  createOpenAiNewsAdapter,
  createProductHuntAdapter,
  huggingFaceModelsSource,
  openAiNewsSource,
  productHuntSource,
  type SourceAdapter,
  type SourceDefinition,
} from "@ai-news-navigator/sources";

export interface ConfiguredSource {
  definition: SourceDefinition;
  adapter: SourceAdapter;
}

export function createConfiguredSources(): ConfiguredSource[] {
  return [
    {
      definition: openAiNewsSource,
      adapter: createOpenAiNewsAdapter(),
    },
    {
      definition: productHuntSource,
      adapter: createProductHuntAdapter(),
    },
    {
      definition: arxivAiSource,
      adapter: createArxivAiAdapter(),
    },
    {
      definition: huggingFaceModelsSource,
      adapter: createHuggingFaceModelsAdapter(),
    },
  ];
}
