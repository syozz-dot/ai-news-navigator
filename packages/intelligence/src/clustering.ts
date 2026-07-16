import type { ContentType } from "@ai-news-navigator/sources";

export const CLUSTERING_VERSION = "lexical-v1";

export interface ClusterDocument {
  id: string;
  title: string;
  excerpt?: string | null;
  contentType: ContentType;
  publishedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface StoryCandidate extends ClusterDocument {
  storyId: string;
}

export interface ClusterScore {
  storyId: string;
  score: number;
  threshold: number;
  matched: boolean;
  components: {
    titleTokenSimilarity: number;
    titleCharacterSimilarity: number;
    entitySimilarity: number;
    timeProximity: number;
    actionConflictPenalty: number;
  };
  reasons: string[];
}

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "about",
  "new",
  "now",
  "how",
  "its",
  "our",
  "your",
  "using",
  "use",
  "via",
]);

const BRAND_PATTERN =
  /\b(openai|anthropic|ollama|vllm|chatgpt|claude|gemini|llama|mistral|qwen|deepseek|hugging\s*face)\b/gi;
const MODEL_PATTERN =
  /\b(gpt[- ]?[a-z0-9.]+|claude[- ]?[a-z0-9.]+|gemini[- ]?[a-z0-9.]+|llama[- ]?[a-z0-9.]+|qwen[- ]?[a-z0-9.]+|deepseek[- ]?[a-z0-9.]+)\b/gi;
const VERSION_PATTERN = /\bv?\d+(?:\.\d+){1,3}(?:-[a-z0-9.]+)?\b/gi;

const ACTIONS: Record<string, string[]> = {
  launch: ["launch", "release", "available", "introduce", "announce"],
  pricing: ["pricing", "price", "subscription"],
  policy: ["safety", "policy", "regulation", "governance"],
  partnership: ["partnership", "partner", "collaboration"],
  acquisition: ["acquisition", "acquire", "funding", "investment"],
  performance: ["faster", "latency", "throughput", "performance"],
};

function normalize(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function tokens(value: string): Set<string> {
  const normalized = normalize(value);
  const result = new Set<string>();
  for (const token of normalized.match(/[\p{L}\p{N}]+/gu) ?? []) {
    if (token.length >= 3 && !STOP_WORDS.has(token)) result.add(token);
  }
  for (const run of normalized.match(/[\p{Script=Han}]{2,}/gu) ?? []) {
    for (let index = 0; index < run.length - 1; index += 1) {
      result.add(run.slice(index, index + 2));
    }
  }
  return result;
}

function characterTrigrams(value: string): Set<string> {
  const compact = normalize(value).replace(/[^\p{L}\p{N}]+/gu, "");
  const result = new Set<string>();
  for (let index = 0; index <= compact.length - 3; index += 1) {
    result.add(compact.slice(index, index + 3));
  }
  return result;
}

function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function dice(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) return 0;
  let intersection = 0;
  for (const value of left) if (right.has(value)) intersection += 1;
  return (2 * intersection) / (left.size + right.size);
}

function matches(value: string, pattern: RegExp): Set<string> {
  return new Set(
    [...value.matchAll(pattern)].map((match) =>
      normalize(match[0]).replace(/\s/g, "-"),
    ),
  );
}

function entities(document: ClusterDocument): Set<string> {
  const text = `${document.title} ${document.excerpt ?? ""}`;
  const values = new Set([
    ...matches(text, BRAND_PATTERN),
    ...matches(text, MODEL_PATTERN),
  ]);
  const repository = document.metadata?.repository;
  if (typeof repository === "string")
    values.add(`repo:${repository.toLowerCase()}`);
  return values;
}

function actions(document: ClusterDocument): Set<string> {
  const text = normalize(`${document.title} ${document.excerpt ?? ""}`);
  const result = new Set<string>();
  for (const [action, phrases] of Object.entries(ACTIONS)) {
    if (phrases.some((phrase) => text.includes(phrase))) result.add(action);
  }
  return result;
}

function hasDisjointValues(left: Set<string>, right: Set<string>): boolean {
  return (
    left.size > 0 &&
    right.size > 0 &&
    [...left].every((value) => !right.has(value))
  );
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function scoreStoryCandidate(
  item: ClusterDocument,
  candidate: StoryCandidate,
): ClusterScore {
  const itemVersions = matches(item.title, VERSION_PATTERN);
  const candidateVersions = matches(candidate.title, VERSION_PATTERN);
  const itemRepository = item.metadata?.repository;
  const candidateRepository = candidate.metadata?.repository;
  const reasons: string[] = [];
  const paperPair =
    item.contentType === "paper" && candidate.contentType === "paper";
  const threshold = paperPair ? 0.82 : 0.48;

  if (
    (item.contentType === "paper") !== (candidate.contentType === "paper") ||
    hasDisjointValues(itemVersions, candidateVersions) ||
    (typeof itemRepository === "string" &&
      typeof candidateRepository === "string" &&
      itemRepository !== candidateRepository)
  ) {
    return {
      storyId: candidate.storyId,
      score: 0,
      threshold,
      matched: false,
      components: {
        titleTokenSimilarity: 0,
        titleCharacterSimilarity: 0,
        entitySimilarity: 0,
        timeProximity: 0,
        actionConflictPenalty: 0,
      },
      reasons: ["Hard conflict on content type, repository, or version"],
    };
  }

  const titleTokenSimilarity = jaccard(
    tokens(item.title),
    tokens(candidate.title),
  );
  const titleCharacterSimilarity = dice(
    characterTrigrams(item.title),
    characterTrigrams(candidate.title),
  );
  const itemEntities = entities(item);
  const candidateEntities = entities(candidate);
  const entitySimilarity = jaccard(itemEntities, candidateEntities);
  const hoursApart =
    Math.abs(item.publishedAt.getTime() - candidate.publishedAt.getTime()) /
    3_600_000;
  const timeProximity = Math.max(0, 1 - hoursApart / 72);
  const actionConflictPenalty = hasDisjointValues(
    actions(item),
    actions(candidate),
  )
    ? 0.12
    : 0;
  const score = Math.max(
    0,
    titleTokenSimilarity * 0.5 +
      titleCharacterSimilarity * 0.2 +
      entitySimilarity * 0.2 +
      timeProximity * 0.1 -
      actionConflictPenalty,
  );
  if (actionConflictPenalty) reasons.push("Different event actions detected");
  if (entitySimilarity > 0)
    reasons.push("Shared company, model, or repository");
  if (titleTokenSimilarity >= 0.4) reasons.push("Strong title token overlap");

  return {
    storyId: candidate.storyId,
    score: round(score),
    threshold,
    matched: score >= threshold,
    components: {
      titleTokenSimilarity: round(titleTokenSimilarity),
      titleCharacterSimilarity: round(titleCharacterSimilarity),
      entitySimilarity: round(entitySimilarity),
      timeProximity: round(timeProximity),
      actionConflictPenalty,
    },
    reasons,
  };
}

export function findBestStoryMatch(
  item: ClusterDocument,
  candidates: StoryCandidate[],
): ClusterScore | null {
  return (
    candidates
      .map((candidate) => scoreStoryCandidate(item, candidate))
      .filter((score) => score.matched)
      .sort((left, right) => right.score - left.score)[0] ?? null
  );
}
