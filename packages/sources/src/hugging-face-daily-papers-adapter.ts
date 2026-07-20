import type {
  RawSourceItem,
  SourceAdapter,
  SourceDefinition,
  SourceFetchContext,
} from "./types.js";

interface HuggingFacePaperAuthor {
  name?: string;
}

interface HuggingFacePaper {
  id?: string;
  title?: string;
  summary?: string;
  authors?: HuggingFacePaperAuthor[];
  publishedAt?: string;
  submittedOnDailyAt?: string;
  upvotes?: number;
  projectPage?: string;
  githubRepo?: string;
}

interface HuggingFaceDailyPaperEntry {
  paper?: HuggingFacePaper;
  title?: string;
  summary?: string;
  publishedAt?: string;
  numComments?: number;
}

export interface HuggingFaceDailyPapersAdapterOptions {
  definition: SourceDefinition;
  maxItems?: number;
  candidateLimit?: number;
  fetchImpl?: typeof fetch;
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export class HuggingFaceDailyPapersAdapter implements SourceAdapter {
  readonly key: string;

  readonly #definition: SourceDefinition;
  readonly #maxItems: number;
  readonly #candidateLimit: number;
  readonly #fetch: typeof fetch;

  constructor(options: HuggingFaceDailyPapersAdapterOptions) {
    this.key = options.definition.connectorKey;
    this.#definition = options.definition;
    this.#maxItems = options.maxItems ?? 15;
    this.#candidateLimit = options.candidateLimit ?? 50;
    this.#fetch = options.fetchImpl ?? globalThis.fetch;
  }

  async fetch(context: SourceFetchContext): Promise<RawSourceItem[]> {
    const endpoint = new URL("https://huggingface.co/api/daily_papers");
    endpoint.searchParams.set("limit", String(this.#candidateLimit));

    const response = await this.#fetch(endpoint, {
      headers: {
        accept: "application/json",
        "user-agent":
          "AI-News-Navigator/0.1 (+https://github.com/syozz-dot/ai-news-navigator)",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(
        `Hugging Face Daily Papers request failed: ${response.status}`,
      );
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new Error("Hugging Face Daily Papers response was not an array");
    }

    const items: RawSourceItem[] = [];
    for (const entry of payload as HuggingFaceDailyPaperEntry[]) {
      const paper = entry.paper;
      const id = paper?.id;
      const title = entry.title ?? paper?.title;
      if (!id || !title) continue;

      const dailyPublishedAt = parseDate(
        paper.submittedOnDailyAt ?? entry.publishedAt ?? paper.publishedAt,
      );
      if (
        context.since &&
        dailyPublishedAt &&
        dailyPublishedAt.getTime() <= context.since.getTime()
      ) {
        continue;
      }

      const authorNames = (paper.authors ?? [])
        .map((author) => author.name?.trim())
        .filter((name): name is string => Boolean(name));
      const summary = (entry.summary ?? paper.summary)?.trim();

      items.push({
        externalId: `hf-paper:${id}`,
        contentType: "paper",
        title,
        originalTitle: title,
        url: `https://huggingface.co/papers/${id}`,
        ...(summary ? { excerpt: summary.slice(0, 2_000) } : {}),
        ...(authorNames.length > 0
          ? { author: authorNames.slice(0, 6).join(", ") }
          : {}),
        language: this.#definition.language ?? "en",
        ...(dailyPublishedAt ? { publishedAt: dailyPublishedAt } : {}),
        publicationTimeConfidence: dailyPublishedAt ? "exact" : "unknown",
        metadata: {
          sourcePage: this.#definition.homepageUrl,
          upvotes: paper.upvotes ?? 0,
          comments: entry.numComments ?? 0,
          ...(paper.publishedAt
            ? { originalPublishedAt: paper.publishedAt }
            : {}),
          ...(paper.projectPage ? { projectPage: paper.projectPage } : {}),
          ...(paper.githubRepo ? { githubRepo: paper.githubRepo } : {}),
        },
      });

      if (items.length >= this.#maxItems) break;
    }
    return items;
  }
}
