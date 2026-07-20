import {
  anthropicNewsSource,
  arxivAiSource,
  arsTechnicaAiSource,
  createAnthropicNewsAdapter,
  createArxivAiAdapter,
  createArsTechnicaAiAdapter,
  createGoogleAiBlogAdapter,
  createHackerNewsAiAdapter,
  createHuggingFaceDailyPapersAdapter,
  createHuggingFaceModelsAdapter,
  createOpenAiNewsAdapter,
  createProductHuntAdapter,
  createTechCrunchAiAdapter,
  createTheDecoderAdapter,
  createVentureBeatAiAdapter,
  googleAiBlogSource,
  hackerNewsAiSource,
  huggingFaceDailyPapersSource,
  huggingFaceModelsSource,
  openAiNewsSource,
  productHuntSource,
  techCrunchAiSource,
  theDecoderSource,
  ventureBeatAiSource,
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
    {
      definition: anthropicNewsSource,
      adapter: createAnthropicNewsAdapter(),
    },
    {
      definition: googleAiBlogSource,
      adapter: createGoogleAiBlogAdapter(),
    },
    {
      definition: huggingFaceDailyPapersSource,
      adapter: createHuggingFaceDailyPapersAdapter(),
    },
    {
      definition: hackerNewsAiSource,
      adapter: createHackerNewsAiAdapter(),
    },
    {
      definition: techCrunchAiSource,
      adapter: createTechCrunchAiAdapter(),
    },
    {
      definition: arsTechnicaAiSource,
      adapter: createArsTechnicaAiAdapter(),
    },
    {
      definition: ventureBeatAiSource,
      adapter: createVentureBeatAiAdapter(),
    },
    {
      definition: theDecoderSource,
      adapter: createTheDecoderAdapter(),
    },
  ];
}
