export { SourceRegistry } from "./registry.js";
export {
  ArxivSourceAdapter,
  type ArxivSourceAdapterOptions,
} from "./arxiv-adapter.js";
export { arxivAiSource, createArxivAiAdapter } from "./definitions/arxiv-ai.js";
export {
  createOllamaReleaseAdapter,
  createVllmReleaseAdapter,
  ollamaReleaseProject,
  ollamaReleaseSource,
  vllmReleaseProject,
  vllmReleaseSource,
} from "./definitions/github-releases.js";
export {
  createGitHubReleaseAdapter,
  createGitHubReleaseSourceDefinition,
  GitHubReleaseAdapter,
  type GitHubReleaseAdapterOptions,
  type GitHubReleaseProject,
} from "./github-release-adapter.js";
export {
  createOpenAiNewsAdapter,
  openAiNewsSource,
} from "./definitions/openai-news.js";
export {
  RssSourceAdapter,
  type RssSourceAdapterOptions,
} from "./rss-adapter.js";
export type {
  ContentType,
  PublicationTimeConfidence,
  RawSourceItem,
  SourceAdapter,
  SourceDefinition,
  SourceFetchContext,
  SourceReliability,
  SourceType,
} from "./types.js";
