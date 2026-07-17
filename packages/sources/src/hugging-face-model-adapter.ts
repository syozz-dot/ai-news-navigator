import type {
  RawSourceItem,
  SourceAdapter,
  SourceDefinition,
  SourceFetchContext,
} from "./types.js";

interface HuggingFaceModel {
  id?: string;
  author?: string;
  private?: boolean;
  gated?: boolean | string;
  downloads?: number;
  likes?: number;
  trendingScore?: number;
  tags?: string[];
  pipeline_tag?: string;
  createdAt?: string;
}

export interface HuggingFaceModelAdapterOptions {
  definition: SourceDefinition;
  maxItems?: number;
  candidateLimit?: number;
  fetchImpl?: typeof fetch;
}

const allowedTasks = new Set([
  "audio-text-to-text",
  "automatic-speech-recognition",
  "image-text-to-text",
  "text-generation",
  "text-to-audio",
  "text-to-image",
  "text-to-speech",
  "text-to-video",
]);

const derivativeMarkers = [
  "adapter",
  "awq",
  "gptq",
  "gguf",
  "lora",
  "quantized",
];

const trustedAuthors = new Set([
  "ai21labs",
  "black-forest-labs",
  "bytedance-seed",
  "cohere",
  "deepseek-ai",
  "google",
  "meta-llama",
  "microsoft",
  "mistralai",
  "moonshotai",
  "nvidia",
  "openai",
  "qwen",
  "stabilityai",
  "tencent",
  "tencent-hunyuan",
  "thinkingmachines",
  "thudm",
  "zai-org",
]);

function isDerivative(model: HuggingFaceModel): boolean {
  const searchable = [model.id ?? "", ...(model.tags ?? [])]
    .join(" ")
    .toLowerCase();
  return derivativeMarkers.some((marker) => searchable.includes(marker));
}

function isRecent(model: HuggingFaceModel, now: Date): boolean {
  if (!model.createdAt) return false;
  const createdAt = new Date(model.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;
  return now.getTime() - createdAt.getTime() <= 45 * 24 * 60 * 60 * 1_000;
}

function isNotable(model: HuggingFaceModel): boolean {
  const trendingScore = model.trendingScore ?? 0;
  const likes = model.likes ?? 0;
  const downloads = model.downloads ?? 0;
  const hasEvalResults = model.tags?.includes("eval-results") ?? false;
  const trustedAuthor = trustedAuthors.has(model.author?.toLowerCase() ?? "");
  return (
    (trustedAuthor && trendingScore >= 50 && likes >= 100) ||
    (trendingScore >= 80 && hasEvalResults && likes >= 200) ||
    (trendingScore >= 30 && likes >= 250 && downloads >= 100_000)
  );
}

function cleanModelCard(value: string): string {
  return value
    .replace(/^---[\s\S]*?---\s*/u, "")
    .replace(/```[\s\S]*?```/gu, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/gu, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/gu, "$1")
    .replace(/<[^>]+>/gu, " ")
    .replace(/^#{1,6}\s+/gmu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 1_800);
}

function buildMetadataSummary(model: HuggingFaceModel): string {
  const task = model.pipeline_tag ?? "unknown";
  return `Hugging Face Trending 模型。作者 ${model.author ?? "未知"}；任务 ${task}；热度分 ${model.trendingScore ?? 0}；点赞 ${model.likes ?? 0}；下载 ${model.downloads ?? 0}。`;
}

export class HuggingFaceModelAdapter implements SourceAdapter {
  readonly key: string;

  readonly #maxItems: number;
  readonly #candidateLimit: number;
  readonly #fetch: typeof fetch;

  constructor(options: HuggingFaceModelAdapterOptions) {
    this.key = options.definition.connectorKey;
    this.#maxItems = options.maxItems ?? 5;
    this.#candidateLimit = options.candidateLimit ?? 50;
    this.#fetch = options.fetchImpl ?? globalThis.fetch;
  }

  async fetch(context: SourceFetchContext): Promise<RawSourceItem[]> {
    const endpoint = new URL("https://huggingface.co/api/models");
    endpoint.searchParams.set("sort", "trendingScore");
    endpoint.searchParams.set("direction", "-1");
    endpoint.searchParams.set("limit", String(this.#candidateLimit));

    const response = await this.#fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Hugging Face models request failed: ${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) {
      throw new Error("Hugging Face models response was not an array");
    }

    const selected = (payload as HuggingFaceModel[])
      .filter(
        (model) =>
          Boolean(model.id) &&
          model.private !== true &&
          Boolean(model.pipeline_tag) &&
          allowedTasks.has(model.pipeline_tag ?? "") &&
          !isDerivative(model) &&
          isRecent(model, context.now) &&
          isNotable(model),
      )
      .slice(0, this.#maxItems);

    return Promise.all(
      selected.map(async (model): Promise<RawSourceItem> => {
        const modelId = model.id as string;
        const modelUrl = `https://huggingface.co/${modelId}`;
        let modelCard = "";
        try {
          const cardResponse = await this.#fetch(
            `${modelUrl}/raw/main/README.md`,
          );
          if (cardResponse.ok)
            modelCard = cleanModelCard(await cardResponse.text());
        } catch {
          modelCard = "";
        }
        const summary = buildMetadataSummary(model);
        return {
          externalId: `hf-model:${modelId}`,
          contentType: "model",
          title: modelId.split("/").at(-1) ?? modelId,
          originalTitle: modelId,
          url: modelUrl,
          excerpt: modelCard ? `${summary} ${modelCard}` : summary,
          ...(model.author ? { author: model.author } : {}),
          language: "en",
          publishedAt: model.createdAt ?? context.now,
          publicationTimeConfidence: model.createdAt ? "exact" : "inferred",
          metadata: {
            modelId,
            author: model.author,
            pipelineTag: model.pipeline_tag,
            trendingScore: model.trendingScore ?? 0,
            likes: model.likes ?? 0,
            downloads: model.downloads ?? 0,
            hasEvalResults: model.tags?.includes("eval-results") ?? false,
            selection: "hugging-face-trending-notability-v1",
          },
        };
      }),
    );
  }
}

export function createHuggingFaceModelAdapter(
  definition: SourceDefinition,
  fetchImpl?: typeof fetch,
) {
  return new HuggingFaceModelAdapter({
    definition,
    ...(fetchImpl ? { fetchImpl } : {}),
  });
}
