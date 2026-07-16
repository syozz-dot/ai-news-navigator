import { XMLParser } from "fast-xml-parser";

import type {
  RawSourceItem,
  SourceAdapter,
  SourceFetchContext,
} from "./types.js";

type XmlRecord = Record<string, unknown>;

export interface ArxivSourceAdapterOptions {
  key: string;
  searchQuery: string;
  maxItems?: number;
  pageSize?: number;
  maxPages?: number;
  requestIntervalMs?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

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
    const text = String(value).replace(/\s+/g, " ").trim();
    return text || undefined;
  }
  if (isRecord(value)) {
    return textValue(value["#text"] ?? value.value);
  }
  return undefined;
}

function parseDate(value: unknown): Date | undefined {
  const text = textValue(value);
  if (!text) {
    return undefined;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function termValues(value: unknown): string[] {
  return asArray(value)
    .map((item) =>
      isRecord(item) ? textValue(item["@term"]) : textValue(item),
    )
    .filter((item): item is string => Boolean(item));
}

function linkBy(entry: XmlRecord, predicate: (link: XmlRecord) => boolean) {
  const link = asArray(entry.link).filter(isRecord).find(predicate);
  return link ? textValue(link["@href"]) : undefined;
}

function formatAuthors(authors: string[]): string | undefined {
  if (authors.length === 0) {
    return undefined;
  }
  const visible = authors.slice(0, 3).join(", ");
  const formatted = authors.length > 3 ? `${visible} et al.` : visible;
  return formatted.length > 256
    ? `${formatted.slice(0, 253).trimEnd()}...`
    : formatted;
}

function arxivId(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value.replace(/^https?:\/\/arxiv\.org\/abs\//, "");
}

function wait(milliseconds: number): Promise<void> {
  return milliseconds > 0
    ? new Promise((resolve) => setTimeout(resolve, milliseconds))
    : Promise.resolve();
}

export class ArxivSourceAdapter implements SourceAdapter {
  readonly key: string;

  readonly #searchQuery: string;
  readonly #maxItems: number;
  readonly #pageSize: number;
  readonly #maxPages: number;
  readonly #requestIntervalMs: number;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;
  readonly #parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@",
    removeNSPrefix: true,
    trimValues: true,
    parseTagValue: false,
  });

  constructor(options: ArxivSourceAdapterOptions) {
    const maxItems = options.maxItems ?? 50;
    const pageSize = options.pageSize ?? 50;
    const maxPages = options.maxPages ?? 3;
    if (!options.searchQuery.trim()) {
      throw new Error("arXiv searchQuery is required");
    }
    if (!Number.isInteger(maxItems) || maxItems < 1) {
      throw new Error("arXiv maxItems must be a positive integer");
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error("arXiv pageSize must be between 1 and 100");
    }
    if (!Number.isInteger(maxPages) || maxPages < 1) {
      throw new Error("arXiv maxPages must be a positive integer");
    }
    if ((options.requestIntervalMs ?? 3_000) < 0) {
      throw new Error("arXiv requestIntervalMs cannot be negative");
    }
    if ((options.timeoutMs ?? 20_000) < 1) {
      throw new Error("arXiv timeoutMs must be at least 1");
    }

    this.key = options.key;
    this.#searchQuery = options.searchQuery;
    this.#maxItems = maxItems;
    this.#pageSize = pageSize;
    this.#maxPages = maxPages;
    this.#requestIntervalMs = options.requestIntervalMs ?? 3_000;
    this.#timeoutMs = options.timeoutMs ?? 20_000;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  async fetch(context: SourceFetchContext): Promise<RawSourceItem[]> {
    const items: RawSourceItem[] = [];

    for (let page = 0; page < this.#maxPages; page += 1) {
      if (page > 0) {
        await wait(this.#requestIntervalMs);
      }

      const entries = await this.#fetchPage(page * this.#pageSize);
      if (entries.length === 0) {
        break;
      }

      let reachedCheckpoint = false;
      for (const entry of entries) {
        const publishedAt = parseDate(entry.published);
        if (
          context.since &&
          publishedAt &&
          publishedAt.getTime() <= context.since.getTime()
        ) {
          reachedCheckpoint = true;
          continue;
        }

        const item = this.#mapEntry(entry, publishedAt);
        if (item) {
          items.push(item);
        }
        if (items.length >= this.#maxItems) {
          return items;
        }
      }

      if (
        entries.length < this.#pageSize ||
        (context.since && reachedCheckpoint)
      ) {
        break;
      }
    }

    return items;
  }

  async #fetchPage(start: number): Promise<XmlRecord[]> {
    const url = new URL("https://export.arxiv.org/api/query");
    url.searchParams.set("search_query", this.#searchQuery);
    url.searchParams.set("start", String(start));
    url.searchParams.set("max_results", String(this.#pageSize));
    url.searchParams.set("sortBy", "submittedDate");
    url.searchParams.set("sortOrder", "descending");

    const response = await this.#fetch(url, {
      headers: {
        accept: "application/atom+xml, application/xml",
        "user-agent":
          "AI-News-Navigator/0.1 (+https://github.com/syozz-dot/ai-news-navigator)",
      },
      signal: AbortSignal.timeout(this.#timeoutMs),
    });
    if (!response.ok) {
      throw new Error(
        `arXiv request failed with ${response.status} ${response.statusText}`.trim(),
      );
    }

    const document = this.#parser.parse(await response.text()) as unknown;
    if (!isRecord(document) || !isRecord(document.feed)) {
      throw new Error("arXiv response does not contain an Atom feed");
    }
    return asArray(document.feed.entry).filter(isRecord);
  }

  #mapEntry(
    entry: XmlRecord,
    publishedAt: Date | undefined,
  ): RawSourceItem | null {
    const title = textValue(entry.title);
    const idUrl = textValue(entry.id);
    const url = linkBy(entry, (link) => link["@rel"] === "alternate") ?? idUrl;
    if (!title || !url) {
      return null;
    }

    const authors = asArray(entry.author)
      .map((author) =>
        isRecord(author) ? textValue(author.name) : textValue(author),
      )
      .filter((author): author is string => Boolean(author));
    const categories = termValues(entry.category);
    const primaryCategory = isRecord(entry.primary_category)
      ? textValue(entry.primary_category["@term"])
      : undefined;
    const updatedAt = parseDate(entry.updated);
    const excerpt = textValue(entry.summary)?.slice(0, 4_000).trim();
    const externalId = arxivId(idUrl);
    const author = formatAuthors(authors);
    const pdfUrl = linkBy(
      entry,
      (link) => link["@type"] === "application/pdf" || link["@title"] === "pdf",
    );

    return {
      contentType: "paper",
      title,
      url,
      ...(externalId ? { externalId } : {}),
      ...(excerpt ? { excerpt } : {}),
      ...(author ? { author } : {}),
      language: "en",
      ...(publishedAt ? { publishedAt } : {}),
      publicationTimeConfidence: publishedAt ? "exact" : "unknown",
      metadata: {
        query: this.#searchQuery,
        authors,
        categories,
        ...(primaryCategory ? { primaryCategory } : {}),
        ...(pdfUrl ? { pdfUrl } : {}),
        ...(updatedAt ? { updatedAt: updatedAt.toISOString() } : {}),
        ...(textValue(entry.comment)
          ? { comment: textValue(entry.comment) }
          : {}),
        ...(textValue(entry.doi) ? { doi: textValue(entry.doi) } : {}),
      },
    };
  }
}
