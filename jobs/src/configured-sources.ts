import {
  arxivAiSource,
  createArxivAiAdapter,
  createOllamaReleaseAdapter,
  createOpenAiNewsAdapter,
  createVllmReleaseAdapter,
  ollamaReleaseSource,
  openAiNewsSource,
  vllmReleaseSource,
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
      definition: arxivAiSource,
      adapter: createArxivAiAdapter(),
    },
    {
      definition: ollamaReleaseSource,
      adapter: createOllamaReleaseAdapter(),
    },
    {
      definition: vllmReleaseSource,
      adapter: createVllmReleaseAdapter(),
    },
  ];
}
