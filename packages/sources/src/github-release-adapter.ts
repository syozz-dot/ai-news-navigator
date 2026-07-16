import { RssSourceAdapter } from "./rss-adapter.js";
import type {
  RawSourceItem,
  SourceAdapter,
  SourceDefinition,
  SourceFetchContext,
} from "./types.js";

export interface GitHubReleaseProject {
  owner: string;
  repository: string;
  displayName: string;
  fetchIntervalMinutes?: number;
}

export interface GitHubReleaseAdapterOptions {
  definition: SourceDefinition;
  displayName: string;
  maxItems?: number;
  excludePrereleases?: boolean;
  fetchImpl?: typeof fetch;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isPrerelease(item: RawSourceItem): boolean {
  return /(?:^|[./_-])(alpha|beta|rc|preview|pre)\d*(?:$|[./_-])/i.test(
    item.url,
  );
}

export function createGitHubReleaseSourceDefinition(
  project: GitHubReleaseProject,
): SourceDefinition {
  if (
    !/^[a-z\d](?:[a-z\d.-]*[a-z\d])?$/i.test(project.owner) ||
    !/^[a-z\d_.-]+$/i.test(project.repository) ||
    !project.displayName.trim()
  ) {
    throw new Error("Invalid GitHub release project definition");
  }
  const repositoryPath = `${project.owner}/${project.repository}`;
  return {
    key: `github-${slug(project.owner)}-${slug(project.repository)}-releases`,
    name: `${project.displayName} Releases`,
    type: "github",
    reliability: "primary",
    connectorKey: `github-releases:${repositoryPath}`,
    homepageUrl: `https://github.com/${repositoryPath}/releases`,
    feedUrl: `https://github.com/${repositoryPath}/releases.atom`,
    language: "en",
    isFirstParty: true,
    allowFullText: false,
    fetchIntervalMinutes: project.fetchIntervalMinutes ?? 60,
  };
}

export class GitHubReleaseAdapter implements SourceAdapter {
  readonly key: string;

  readonly #displayName: string;
  readonly #repository: string;
  readonly #maxItems: number;
  readonly #excludePrereleases: boolean;
  readonly #rss: RssSourceAdapter;

  constructor(options: GitHubReleaseAdapterOptions) {
    if (!options.definition.feedUrl) {
      throw new Error("GitHub release source requires a feedUrl");
    }
    if (
      options.maxItems !== undefined &&
      (!Number.isInteger(options.maxItems) || options.maxItems < 1)
    ) {
      throw new Error("GitHub release maxItems must be a positive integer");
    }
    this.key = options.definition.connectorKey;
    this.#displayName = options.displayName;
    this.#repository = options.definition.connectorKey.replace(
      "github-releases:",
      "",
    );
    this.#maxItems = options.maxItems ?? 20;
    this.#excludePrereleases = options.excludePrereleases ?? true;
    this.#rss = new RssSourceAdapter({
      key: this.key,
      feedUrl: options.definition.feedUrl,
      contentType: "release",
      ...(options.definition.language
        ? { language: options.definition.language }
        : {}),
      maxItems: Math.max(this.#maxItems * 3, 50),
      useContentAsExcerpt: true,
      maxExcerptCharacters: 2_000,
      datedConfidence: "inferred",
      ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    });
  }

  async fetch(context: SourceFetchContext): Promise<RawSourceItem[]> {
    const items = await this.#rss.fetch(context);
    return items
      .filter((item) => !this.#excludePrereleases || !isPrerelease(item))
      .slice(0, this.#maxItems)
      .map((item) => ({
        ...item,
        title: `${this.#displayName} ${item.title}`,
        metadata: {
          ...item.metadata,
          repository: this.#repository,
          releaseChannel: "stable",
        },
      }));
  }
}

export function createGitHubReleaseAdapter(
  project: GitHubReleaseProject,
  definition: SourceDefinition,
  fetchImpl?: typeof fetch,
): GitHubReleaseAdapter {
  return new GitHubReleaseAdapter({
    definition,
    displayName: project.displayName,
    ...(fetchImpl ? { fetchImpl } : {}),
  });
}
