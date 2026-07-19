export const TOPIC_CLASSIFIER_VERSION = "topic-rules-v1";

export const CURATED_TOPICS = [
  {
    slug: "agent",
    name: "Agent 智能体",
    group: "focus",
    description:
      "模型从回答问题走向规划、调用工具和完成多步任务。这里追踪 Agent 框架、产品与可靠性评测。",
    aliases: ["agent", "agents", "agentic", "智能体"],
  },
  {
    slug: "ai-coding",
    name: "AI 编码",
    group: "focus",
    description:
      "AI 进入软件开发全流程，从代码补全、编码代理到测试和协作工作流。",
    aliases: ["ai coding", "coding agent", "代码生成", "编码助手"],
  },
  {
    slug: "ai-video",
    name: "AI 视频",
    group: "focus",
    description:
      "追踪视频生成、理解与编辑工具，关注模型能力如何进入真实创作流程。",
    aliases: ["ai video", "video generation", "文生视频", "视频生成"],
  },
  {
    slug: "image-generation",
    name: "图像生成",
    group: "focus",
    description:
      "覆盖文生图、图像编辑与视觉创作工具，重点关注可控性、质量和生产效率。",
    aliases: ["image generation", "text to image", "文生图", "图像生成"],
  },
  {
    slug: "safety-alignment",
    name: "安全与对齐",
    group: "focus",
    description:
      "聚焦模型对齐、越狱防御、安全评测与治理机制，区分真实风险和泛化口号。",
    aliases: ["ai safety", "alignment", "jailbreak", "安全对齐"],
  },
  {
    slug: "embodied-ai",
    name: "具身智能",
    group: "focus",
    description:
      "AI 进入物理世界：人形机器人、具身基础模型，以及感知与操作能力的进展。",
    aliases: ["embodied ai", "robotics", "humanoid", "具身智能"],
  },
  {
    slug: "llm-reasoning",
    name: "大模型与推理",
    group: "foundation",
    description:
      "追踪基础模型、推理能力、上下文与训练方法的关键变化，不收录只有参数宣传的更新。",
    aliases: ["llm", "reasoning model", "大语言模型", "推理模型"],
  },
  {
    slug: "multimodal",
    name: "多模态",
    group: "foundation",
    description: "关注模型跨文本、图像、音频和视频理解与交互的能力进展。",
    aliases: ["multimodal", "vision language", "多模态"],
  },
  {
    slug: "voice-audio",
    name: "语音与音频",
    group: "foundation",
    description:
      "覆盖语音识别、合成、实时对话与音乐生成，关注延迟、自然度和可用性。",
    aliases: ["speech", "voice", "audio", "语音", "音频"],
  },
  {
    slug: "open-source",
    name: "开源模型与生态",
    group: "foundation",
    description:
      "追踪开放权重模型、框架与社区生态，关注部署门槛、许可证和真实可用性。",
    aliases: ["open source", "open weights", "开源", "开放权重"],
  },
] as const;

export type CuratedTopic = (typeof CURATED_TOPICS)[number];
export type CuratedTopicSlug = CuratedTopic["slug"];
export type CuratedTopicGroup = CuratedTopic["group"];

export interface TopicClassificationInput {
  title: string;
  excerpt?: string | null | undefined;
  translatedTitle?: string | null | undefined;
  factualSummary?: string | null | undefined;
  whyItMatters?: string | null | undefined;
  matchedSignals?: readonly string[] | undefined;
}

export interface TopicClassification {
  slug: CuratedTopicSlug;
  confidence: number;
  reasons: string[];
}

interface TopicRule {
  slug: CuratedTopicSlug;
  signals?: readonly string[];
  phrases: readonly string[];
}

const TOPIC_RULES: readonly TopicRule[] = [
  {
    slug: "agent",
    signals: ["ai:agents", "ai:tool-use"],
    phrases: [
      "ai agent",
      "agentic",
      "multi agent",
      "agents",
      "agent",
      "tool use",
      "tool calling",
      "function calling",
      "computer use",
      "model context protocol",
      "mcp",
      "智能体",
      "ai代理",
      "llm代理",
      "代理系统",
      "工具调用",
    ],
  },
  {
    slug: "ai-coding",
    phrases: [
      "ai coding",
      "coding agent",
      "coding assistant",
      "code generation",
      "code model",
      "developer tool",
      "software engineering",
      "vibe coding",
      "claude code",
      "github copilot",
      "cursor",
      "codex",
      "代码生成",
      "编码助手",
      "代码助手",
      "编程助手",
      "软件工程",
      "开发者工具",
    ],
  },
  {
    slug: "ai-video",
    phrases: [
      "text to video",
      "video generation",
      "video generator",
      "video editing",
      "video model",
      "sora",
      "veo",
      "runway",
      "kling",
      "vidu",
      "hailuo",
      "文生视频",
      "视频生成",
      "视频编辑",
      "视频模型",
      "可灵",
    ],
  },
  {
    slug: "image-generation",
    phrases: [
      "text to image",
      "image generation",
      "image generator",
      "image editing",
      "diffusion model",
      "midjourney",
      "stable diffusion",
      "flux",
      "imagen",
      "文生图",
      "图像生成",
      "图片生成",
      "图像编辑",
      "扩散模型",
    ],
  },
  {
    slug: "safety-alignment",
    signals: ["product:safety-policy"],
    phrases: [
      "ai safety",
      "model safety",
      "alignment",
      "jailbreak",
      "red teaming",
      "red team",
      "guardrail",
      "constitutional ai",
      "安全对齐",
      "模型安全",
      "越狱",
      "红队",
      "安全评测",
      "风险评估",
      "治理框架",
    ],
  },
  {
    slug: "embodied-ai",
    phrases: [
      "embodied ai",
      "embodied intelligence",
      "humanoid robot",
      "robotics",
      "robot",
      "vision language action",
      "vla model",
      "具身智能",
      "人形机器人",
      "机器人",
      "机械臂",
      "灵巧手",
      "物理世界",
    ],
  },
  {
    slug: "llm-reasoning",
    signals: [
      "ai:model-family",
      "ai:large-language-model",
      "ai:foundation-model",
      "ai:reasoning",
      "ai:transformers",
    ],
    phrases: [
      "large language model",
      "foundation model",
      "reasoning model",
      "chain of thought",
      "language model",
      "llm",
      "transformer",
      "大语言模型",
      "基础模型",
      "推理模型",
      "思维链",
      "大模型",
    ],
  },
  {
    slug: "multimodal",
    signals: ["ai:multimodal"],
    phrases: [
      "multimodal",
      "multi modal",
      "vision language",
      "image text",
      "audio visual",
      "多模态",
      "视觉语言",
      "图文理解",
      "跨模态",
    ],
  },
  {
    slug: "voice-audio",
    phrases: [
      "text to speech",
      "speech recognition",
      "speech synthesis",
      "voice cloning",
      "audio generation",
      "audio model",
      "music generation",
      "real time voice",
      "tts",
      "asr",
      "语音识别",
      "语音合成",
      "声音克隆",
      "实时语音",
      "音频生成",
      "音乐生成",
      "语音模型",
    ],
  },
  {
    slug: "open-source",
    signals: ["product:open-source"],
    phrases: [
      "open source",
      "open weights",
      "open weight",
      "source available",
      "开源",
      "开放权重",
      "开源权重",
      "开放源码",
    ],
  },
];

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\p{P}\p{S}_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesPhrase(text: string, phrase: string): boolean {
  const normalizedPhrase = normalize(phrase);
  if (!normalizedPhrase) return false;
  if (/[^\x00-\x7F]/.test(normalizedPhrase)) {
    return text.includes(normalizedPhrase);
  }
  return ` ${text} `.includes(` ${normalizedPhrase} `);
}

function matchingPhrases(text: string, phrases: readonly string[]): string[] {
  return phrases.filter((phrase) => includesPhrase(text, phrase));
}

export function classifyStoryTopics(
  input: TopicClassificationInput,
): TopicClassification[] {
  const title = normalize(
    [input.title, input.translatedTitle].filter(Boolean).join(" "),
  );
  const body = normalize(
    [input.excerpt, input.factualSummary, input.whyItMatters]
      .filter(Boolean)
      .join(" "),
  );
  const signals = new Set(input.matchedSignals ?? []);

  return TOPIC_RULES.flatMap((rule) => {
    const titleMatches = matchingPhrases(title, rule.phrases);
    const bodyMatches = matchingPhrases(body, rule.phrases);
    const signalMatches = (rule.signals ?? []).filter((signal) =>
      signals.has(signal),
    );
    if (titleMatches.length === 0 && bodyMatches.length === 0) {
      return [];
    }

    const confidence = Math.min(
      0.98,
      0.48 +
        Math.min(0.28, titleMatches.length * 0.14) +
        Math.min(0.12, bodyMatches.length * 0.06) +
        Math.min(0.22, signalMatches.length * 0.22),
    );
    const reasons = [
      ...signalMatches.map((signal) => `signal:${signal}`),
      ...titleMatches.slice(0, 2).map((phrase) => `title:${phrase}`),
      ...bodyMatches.slice(0, 2).map((phrase) => `body:${phrase}`),
    ];

    return [{ slug: rule.slug, confidence, reasons }];
  }).sort((a, b) => b.confidence - a.confidence);
}

export function findCuratedTopic(slug: string): CuratedTopic | undefined {
  return CURATED_TOPICS.find((topic) => topic.slug === slug);
}
