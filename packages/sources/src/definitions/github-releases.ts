import {
  createGitHubReleaseAdapter,
  createGitHubReleaseSourceDefinition,
  type GitHubReleaseProject,
} from "../github-release-adapter.js";

export const ollamaReleaseProject = {
  owner: "ollama",
  repository: "ollama",
  displayName: "Ollama",
  fetchIntervalMinutes: 60,
} satisfies GitHubReleaseProject;

export const vllmReleaseProject = {
  owner: "vllm-project",
  repository: "vllm",
  displayName: "vLLM",
  fetchIntervalMinutes: 60,
} satisfies GitHubReleaseProject;

export const ollamaReleaseSource =
  createGitHubReleaseSourceDefinition(ollamaReleaseProject);
export const vllmReleaseSource =
  createGitHubReleaseSourceDefinition(vllmReleaseProject);

export function createOllamaReleaseAdapter(fetchImpl?: typeof fetch) {
  return createGitHubReleaseAdapter(
    ollamaReleaseProject,
    ollamaReleaseSource,
    fetchImpl,
  );
}

export function createVllmReleaseAdapter(fetchImpl?: typeof fetch) {
  return createGitHubReleaseAdapter(
    vllmReleaseProject,
    vllmReleaseSource,
    fetchImpl,
  );
}
