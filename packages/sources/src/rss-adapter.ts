import { XMLParser } from "fast-xml-parser";

import type {
  ContentType,
  RawSourceItem,
  SourceAdapter,
  SourceFetchContext,
} from "./types.js";

const DEFAULT_ACCEPT =
  "application/rss+xml, application/atom+xml, application/xml, text/xml";

export interface RssSourceAdapterOptions {
  key: string;
  feedUrl: string;
  contentType: ContentType;
  language?: string;
  maxItems?: number;
  includeContent?: boolean;
  useContentAsExcerpt?: boolean;
  maxExcerptCharacters?: number;
  datedConfidence?: "exact" | "inferred";
  timeoutMs?: number;
  userAgent?: string;
  fetchImpl?: typeof fetch;
}

type XmlRecord = Record<string, unknown>;

function isRecord(value: unknown): value is XmlRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text || undefined;
  }

  if (Array.isArray(value)) {
    return value.map(textValue).find((text) => text !== undefined);
  }

  if (isRecord(value)) {
    return textValue(value["#text"] ?? value.value);
  }

  return undefined;
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
    /&(#\d+|#x[\da-f]+|amp|apos|gt|lt|nbsp|quot);/gi,
    (entity, code: string) => {
      if (code.startsWith("#x") || code.startsWith("#X")) {
        return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
      }
      if (code.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
      }
      return namedEntities[code.toLowerCase()] ?? entity;
    },
  );
}

function htmlToText(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const text = decodeHtmlEntities(
    value
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

  return text || undefined;
}

function parseDate(value: unknown): Date | undefined {
  const text = textValue(value);
  if (!text) {
    return undefined;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function linkValue(value: unknown): string | undefined {
  const direct = textValue(value);
  if (direct) {
    return direct;
  }

  const links = asArray(value).filter(isRecord);
  const preferred =
    links.find((link) => link["@rel"] === "alternate") ??
    links.find((link) => link["@rel"] === undefined) ??
    links[0];

  return preferred
    ? textValue(preferred["@href"] ?? preferred.href)
    : undefined;
}

function categoryValues(value: unknown): string[] {
  return asArray(value)
    .map((category) => {
      if (isRecord(category)) {
        return textValue(
          category["@term"] ?? category.term ?? category["#text"],
        );
      }
      return textValue(category);
    })
    .filter((category): category is string => Boolean(category));
}

function getFeedEntries(document: unknown): XmlRecord[] | null {
  if (!isRecord(document)) {
    return null;
  }

  const rss = document.rss;
  if (isRecord(rss) && isRecord(rss.channel)) {
    return asArray(rss.channel.item).filter(isRecord);
  }

  const feed = document.feed;
  if (isRecord(feed)) {
    return asArray(feed.entry).filter(isRecord);
  }

  return null;
}

function authorValue(entry: XmlRecord): string | undefined {
  const author = entry.author;
  if (isRecord(author)) {
    return textValue(author.name ?? author["#text"]);
  }
  return textValue(author ?? entry.creator);
}

export class RssSourceAdapter implements SourceAdapter {
  readonly key: string;

  readonly #options: Required<
    Pick<
      RssSourceAdapterOptions,
      | "feedUrl"
      | "contentType"
      | "maxItems"
      | "includeContent"
      | "useContentAsExcerpt"
      | "maxExcerptCharacters"
      | "datedConfidence"
      | "timeoutMs"
      | "userAgent"
    >
  > &
    Pick<RssSourceAdapterOptions, "language">;
  readonly #fetch: typeof fetch;
  readonly #parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    removeNSPrefix: true,
    trimValues: true,
    parseTagValue: false,
  });

  constructor(options: RssSourceAdapterOptions) {
    if (options.maxItems !== undefined && options.maxItems < 1) {
      throw new Error("RSS maxItems must be at least 1");
    }
    if (
      options.maxExcerptCharacters !== undefined &&
      options.maxExcerptCharacters < 1
    ) {
      throw new Error("RSS maxExcerptCharacters must be at least 1");
    }

    this.key = options.key;
    this.#options = {
      feedUrl: options.feedUrl,
      contentType: options.contentType,
      maxItems: options.maxItems ?? 50,
      includeContent: options.includeContent ?? false,
      useContentAsExcerpt: options.useContentAsExcerpt ?? false,
      maxExcerptCharacters: options.maxExcerptCharacters ?? 2_000,
      datedConfidence: options.datedConfidence ?? "exact",
      timeoutMs: options.timeoutMs ?? 15_000,
      userAgent:
        options.userAgent ??
        "AI-News-Navigator/0.1 (+https://github.com/syozz-dot/ai-news-navigator)",
      ...(options.language ? { language: options.language } : {}),
    };
    this.#fetch = options.fetchImpl ?? fetch;
  }

  async fetch(context: SourceFetchContext): Promise<RawSourceItem[]> {
    const response = await this.#fetch(this.#options.feedUrl, {
      headers: {
        accept: DEFAULT_ACCEPT,
        "user-agent": this.#options.userAgent,
      },
      signal: AbortSignal.timeout(this.#options.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `RSS request failed with ${response.status} ${response.statusText}`.trim(),
      );
    }

    const document = this.#parser.parse(await response.text()) as unknown;
    const entries = getFeedEntries(document);
    if (!entries) {
      throw new Error("RSS response does not contain an RSS or Atom feed");
    }
    const items: RawSourceItem[] = [];

    for (const entry of entries) {
      const title = textValue(entry.title);
      const url = linkValue(entry.link);
      if (!title || !url) {
        continue;
      }

      const publishedAt = parseDate(
        entry.pubDate ?? entry.published ?? entry.updated ?? entry.date,
      );
      if (
        context.since &&
        publishedAt &&
        publishedAt.getTime() <= context.since.getTime()
      ) {
        continue;
      }

      const summary = textValue(entry.description ?? entry.summary);
      const fullContent = textValue(entry.encoded ?? entry.content);
      const categories = categoryValues(entry.category);
      const externalId = textValue(entry.guid ?? entry.id);
      const excerptText = htmlToText(
        summary ??
          (this.#options.useContentAsExcerpt ? fullContent : undefined),
      );
      const excerpt = excerptText
        ? excerptText.slice(0, this.#options.maxExcerptCharacters).trim()
        : undefined;
      const author = authorValue(entry);

      items.push({
        contentType: this.#options.contentType,
        title,
        url,
        ...(externalId ? { externalId } : {}),
        ...(excerpt ? { excerpt } : {}),
        ...(this.#options.includeContent && fullContent
          ? { content: fullContent }
          : {}),
        ...(author ? { author } : {}),
        ...(this.#options.language ? { language: this.#options.language } : {}),
        ...(publishedAt ? { publishedAt } : {}),
        publicationTimeConfidence: publishedAt
          ? this.#options.datedConfidence
          : "unknown",
        metadata: {
          feedUrl: this.#options.feedUrl,
          categories,
        },
      });

      if (items.length >= this.#options.maxItems) {
        break;
      }
    }

    return items;
  }
}
