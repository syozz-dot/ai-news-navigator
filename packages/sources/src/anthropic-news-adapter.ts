import type {
  RawSourceItem,
  SourceAdapter,
  SourceDefinition,
  SourceFetchContext,
} from "./types.js";

export interface AnthropicNewsAdapterOptions {
  definition: SourceDefinition;
  maxItems?: number;
  fetchImpl?: typeof fetch;
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(
    /&(#\d+|#x[\da-f]+|amp|apos|gt|lt|nbsp|quot);/giu,
    (entity, code: string) => {
      if (/^#x/iu.test(code)) {
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      }
      if (code.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      }
      return namedEntities[code.toLowerCase()] ?? entity;
    },
  );
}

function cleanHtml(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const text = decodeHtmlEntities(value.replace(/<[^>]+>/gu, " "))
    .replace(/\s+/gu, " ")
    .trim();
  return text || undefined;
}

function parsePublicationDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value} 00:00:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export class AnthropicNewsAdapter implements SourceAdapter {
  readonly key: string;

  readonly #definition: SourceDefinition;
  readonly #maxItems: number;
  readonly #fetch: typeof fetch;

  constructor(options: AnthropicNewsAdapterOptions) {
    this.key = options.definition.connectorKey;
    this.#definition = options.definition;
    this.#maxItems = options.maxItems ?? 30;
    this.#fetch = options.fetchImpl ?? globalThis.fetch;
  }

  async fetch(context: SourceFetchContext): Promise<RawSourceItem[]> {
    const response = await this.#fetch(this.#definition.homepageUrl, {
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent":
          "AI-News-Navigator/0.1 (+https://github.com/syozz-dot/ai-news-navigator)",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`Anthropic Newsroom request failed: ${response.status}`);
    }

    const html = await response.text();
    const items: RawSourceItem[] = [];
    const seen = new Set<string>();
    const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/giu;
    const anchors = [...html.matchAll(anchorPattern)];
    const summaries = new Map<string, string>();

    for (const match of anchors) {
      const attributes = match[1] ?? "";
      const body = match[2] ?? "";
      const path = attributes.match(/\bhref="(\/news\/[^"?#]+)"/iu)?.[1];
      const summary = cleanHtml(body.match(/<p\b[^>]*>([\s\S]*?)<\/p>/iu)?.[1]);
      if (path && summary && !summaries.has(path)) {
        summaries.set(path, summary);
      }
    }

    for (const match of anchors) {
      const attributes = match[1] ?? "";
      const body = match[2] ?? "";
      if (
        !attributes.includes("PublicationList") ||
        !attributes.includes("listItem")
      ) {
        continue;
      }

      const path = attributes.match(/\bhref="(\/news\/[^"?#]+)"/iu)?.[1];
      if (!path || seen.has(path)) continue;

      const title = cleanHtml(
        body.match(
          /<span\b[^>]*class="[^"]*PublicationList[^"]*__title[^"]*"[^>]*>([\s\S]*?)<\/span>/iu,
        )?.[1],
      );
      if (!title) continue;

      const dateText = cleanHtml(
        body.match(/<time\b[^>]*>([\s\S]*?)<\/time>/iu)?.[1],
      );
      const publishedAt = parsePublicationDate(dateText);
      if (
        context.since &&
        publishedAt &&
        publishedAt.getTime() <= context.since.getTime()
      ) {
        continue;
      }

      const category = cleanHtml(
        body.match(
          /<span\b[^>]*class="[^"]*PublicationList[^"]*__subject[^"]*"[^>]*>([\s\S]*?)<\/span>/iu,
        )?.[1],
      );
      const slug = path.split("/").filter(Boolean).at(-1) as string;
      const excerpt = summaries.get(path);
      seen.add(path);
      items.push({
        externalId: `anthropic-news:${slug}`,
        contentType: "news",
        title,
        url: new URL(path, this.#definition.homepageUrl).toString(),
        ...(excerpt ? { excerpt } : {}),
        author: "Anthropic",
        language: this.#definition.language ?? "en",
        ...(publishedAt ? { publishedAt } : {}),
        publicationTimeConfidence: publishedAt ? "exact" : "unknown",
        metadata: {
          sourcePage: this.#definition.homepageUrl,
          ...(category ? { category } : {}),
        },
      });

      if (items.length >= this.#maxItems) break;
    }

    if (items.length === 0) {
      throw new Error(
        "Anthropic Newsroom response did not contain publication entries",
      );
    }
    return items;
  }
}
