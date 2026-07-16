import type { ContentType } from "@ai-news-navigator/sources";

export const RELEVANCE_SCORER_VERSION = "deterministic-v1";

export interface RelevanceInput {
  title: string;
  excerpt?: string | null;
  contentType: ContentType;
  metadata?: Record<string, unknown>;
}

export interface RelevanceAssessment {
  scorerVersion: string;
  relevanceScore: number;
  aiCentralityScore: number;
  productImpactScore: number;
  isRelevant: boolean;
  matchedSignals: string[];
  reasons: string[];
}

interface WeightedSignal {
  name: string;
  phrases: string[];
  weight: number;
}

const AI_SIGNALS: WeightedSignal[] = [
  { name: "ai-term", phrases: ["ai"], weight: 0.3 },
  {
    name: "ai-company",
    phrases: [
      "openai",
      "anthropic",
      "deepmind",
      "hugging face",
      "ollama",
      "vllm",
      "mistral ai",
      "xai",
      "stability ai",
    ],
    weight: 0.25,
  },
  {
    name: "model-family",
    phrases: [
      "gpt",
      "chatgpt",
      "claude",
      "gemini",
      "llama",
      "qwen",
      "deepseek",
    ],
    weight: 0.34,
  },
  {
    name: "artificial-intelligence",
    phrases: ["artificial intelligence"],
    weight: 0.5,
  },
  { name: "generative-ai", phrases: ["generative ai", "genai"], weight: 0.45 },
  {
    name: "large-language-model",
    phrases: ["large language model", "llm"],
    weight: 0.42,
  },
  { name: "foundation-model", phrases: ["foundation model"], weight: 0.36 },
  {
    name: "reasoning",
    phrases: ["reasoning model", "chain of thought", "reasoning"],
    weight: 0.3,
  },
  {
    name: "agents",
    phrases: ["ai agent", "agentic", "multi-agent"],
    weight: 0.34,
  },
  {
    name: "multimodal",
    phrases: ["multimodal", "vision-language"],
    weight: 0.32,
  },
  { name: "inference", phrases: ["inference", "model serving"], weight: 0.25 },
  {
    name: "rag",
    phrases: ["retrieval augmented", "retrieval-augmented", "rag"],
    weight: 0.25,
  },
  { name: "embeddings", phrases: ["embedding", "vector search"], weight: 0.2 },
  {
    name: "model-training",
    phrases: ["fine-tuning", "finetuning", "model training"],
    weight: 0.22,
  },
  {
    name: "transformers",
    phrases: ["transformer", "attention model"],
    weight: 0.2,
  },
  {
    name: "machine-learning",
    phrases: ["machine learning", "neural network"],
    weight: 0.16,
  },
  {
    name: "tool-use",
    phrases: ["tool calling", "function calling", "computer use"],
    weight: 0.28,
  },
];

const PRODUCT_SIGNALS: WeightedSignal[] = [
  {
    name: "launch",
    phrases: ["launch", "launched", "release", "released", "available"],
    weight: 0.26,
  },
  {
    name: "developer-platform",
    phrases: ["api", "sdk", "developer platform"],
    weight: 0.28,
  },
  {
    name: "pricing",
    phrases: ["pricing", "price", "subscription"],
    weight: 0.3,
  },
  {
    name: "open-source",
    phrases: ["open source", "open-source"],
    weight: 0.22,
  },
  {
    name: "enterprise",
    phrases: ["enterprise", "business customer"],
    weight: 0.2,
  },
  {
    name: "benchmark",
    phrases: ["benchmark", "evaluation", "evals"],
    weight: 0.18,
  },
  {
    name: "safety-policy",
    phrases: ["safety", "regulation", "policy", "governance"],
    weight: 0.2,
  },
  {
    name: "performance",
    phrases: ["latency", "throughput", "faster", "performance"],
    weight: 0.18,
  },
  {
    name: "integration",
    phrases: ["integration", "plugin", "connector"],
    weight: 0.18,
  },
  {
    name: "business-event",
    phrases: ["funding", "acquisition", "partnership"],
    weight: 0.22,
  },
  {
    name: "product-workflow",
    phrases: [
      "workflow",
      "automation",
      "tool calling",
      "use case",
      "teams use",
      "workplace",
      "productivity",
    ],
    weight: 0.2,
  },
];

const CONTENT_PRIOR: Record<ContentType, number> = {
  news: 0.08,
  paper: 0,
  product: 0.1,
  release: 0.12,
  post: 0.04,
  other: 0,
};

const THRESHOLD: Record<ContentType, number> = {
  news: 0.4,
  paper: 0.42,
  product: 0.4,
  release: 0.38,
  post: 0.42,
  other: 0.45,
};

function normalize(value: string): string {
  return ` ${value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#.-]+/gu, " ")} `;
}

function containsPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = normalize(phrase).trim();
  return (
    text.includes(` ${normalizedPhrase} `) ||
    text.includes(` ${normalizedPhrase}-`)
  );
}

function signalScore(
  title: string,
  body: string,
  signals: WeightedSignal[],
): { score: number; matches: string[] } {
  let weight = 0;
  const matches: string[] = [];
  for (const signal of signals) {
    const inTitle = signal.phrases.some((phrase) =>
      containsPhrase(title, phrase),
    );
    const inBody = signal.phrases.some((phrase) =>
      containsPhrase(body, phrase),
    );
    if (!inTitle && !inBody) continue;
    weight += signal.weight * (inTitle ? 1.6 : 1);
    matches.push(signal.name);
  }
  return { score: 1 - Math.exp(-weight), matches };
}

function categoryPrior(metadata: Record<string, unknown> | undefined): number {
  const categories = metadata?.categories;
  if (!Array.isArray(categories)) return 0;
  const values = new Set(
    categories.filter((value): value is string => typeof value === "string"),
  );
  if (values.has("cs.AI")) return 0.3;
  if (values.has("cs.CL")) return 0.26;
  if (values.has("cs.LG")) return 0.2;
  return 0;
}

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export function scoreItemRelevance(input: RelevanceInput): RelevanceAssessment {
  const title = normalize(input.title);
  const body = normalize(input.excerpt ?? "");
  const ai = signalScore(title, body, AI_SIGNALS);
  const product = signalScore(title, body, PRODUCT_SIGNALS);
  const aiCentralityScore = Math.max(ai.score, categoryPrior(input.metadata));
  const productImpactScore = product.score;
  const relevanceScore = Math.min(
    1,
    aiCentralityScore * 0.65 +
      productImpactScore * 0.3 +
      CONTENT_PRIOR[input.contentType],
  );
  const isRelevant =
    aiCentralityScore >= 0.2 && relevanceScore >= THRESHOLD[input.contentType];
  const matchedSignals = [
    ...ai.matches.map((signal) => `ai:${signal}`),
    ...product.matches.map((signal) => `product:${signal}`),
  ];

  return {
    scorerVersion: RELEVANCE_SCORER_VERSION,
    relevanceScore: round(relevanceScore),
    aiCentralityScore: round(aiCentralityScore),
    productImpactScore: round(productImpactScore),
    isRelevant,
    matchedSignals,
    reasons: [
      `AI centrality ${round(aiCentralityScore)}`,
      `Product impact ${round(productImpactScore)}`,
      isRelevant
        ? `Passed ${input.contentType} threshold ${THRESHOLD[input.contentType]}`
        : `Below ${input.contentType} threshold ${THRESHOLD[input.contentType]}`,
    ],
  };
}
