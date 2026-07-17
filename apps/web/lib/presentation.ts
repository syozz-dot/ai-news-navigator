import type { ContentType, StoryStatus } from "./queries";

export const contentTypeLabels = {
  news: "新闻",
  paper: "论文",
  product: "产品",
  release: "发布",
  post: "文章",
  other: "其他",
} as const;

export const storyStatusLabels: Record<StoryStatus, string> = {
  emerging: "单一信源",
  confirmed: "多源确认",
  cooling: "热度回落",
  corrected: "信息修正",
  archived: "已归档",
};

const signalLabels: Record<string, string> = {
  "ai:ai-term": "AI 主题",
  "ai:ai-company": "AI 公司",
  "ai:model-family": "模型家族",
  "ai:artificial-intelligence": "人工智能",
  "ai:generative-ai": "生成式 AI",
  "ai:large-language-model": "大语言模型",
  "ai:foundation-model": "基础模型",
  "ai:reasoning": "推理能力",
  "ai:agents": "智能体",
  "ai:multimodal": "多模态",
  "ai:inference": "模型推理",
  "ai:rag": "检索增强",
  "ai:embeddings": "向量检索",
  "ai:model-training": "模型训练",
  "ai:transformers": "Transformer",
  "ai:machine-learning": "机器学习",
  "ai:tool-use": "工具调用",
  "product:launch": "发布动态",
  "product:developer-platform": "开发者平台",
  "product:pricing": "价格变化",
  "product:open-source": "开源",
  "product:enterprise": "企业应用",
  "product:benchmark": "评测基准",
  "product:safety-policy": "安全与治理",
  "product:performance": "性能改进",
  "product:integration": "产品集成",
  "product:business-event": "商业事件",
  "product:product-workflow": "工作流",
  ai_core_term: "AI 核心主题",
  foundation_model: "基础模型",
  model_release: "模型发布",
  developer_tool: "开发工具",
  product_launch: "产品发布",
  product_impact: "产品影响",
  research_signal: "研究进展",
  benchmark_signal: "评测进展",
  infrastructure_signal: "基础设施",
};

export function signalLabel(signal: string) {
  return signalLabels[signal] ?? signal.replaceAll("_", " ");
}

const contentTypeSubjects: Record<ContentType, string> = {
  news: "一则 AI 新闻",
  paper: "一篇 AI 论文",
  product: "一项产品动态",
  release: "一次版本发布",
  post: "一篇官方文章",
  other: "一条 AI 动态",
};

export function buildRuleDigest(input: {
  contentType: ContentType | null;
  sourceName: string | null;
  matchedSignals: string[];
  independentSourceCount: number;
}) {
  const source = input.sourceName ?? "当前信源";
  const subject = input.contentType
    ? contentTypeSubjects[input.contentType]
    : "一条 AI 动态";
  const signals = input.matchedSignals.slice(0, 3).map(signalLabel);
  const signalSentence = signals.length
    ? `规则识别到「${signals.join("、")}」等信号。`
    : "暂未识别到可展示的规则信号。";
  return `来自 ${source} 的${subject}进入情报流。${signalSentence}当前由 ${input.independentSourceCount} 个独立信源支持。`;
}

export function buildRuleSignalNote(signals: string[]) {
  const labels = signals.slice(0, 3).map(signalLabel);
  return labels.length
    ? `当前可核验的规则线索包括「${labels.join("、")}」；它们用于筛选，不代替产品影响判断。`
    : "当前没有足够的规则线索支持产品影响判断。";
}

export function formatScore(score: number | null) {
  if (score === null) return "--";
  return Math.round(score * 100).toString();
}

export function formatDateTime(value: Date | null) {
  if (!value) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export function formatFullDateTime(value: Date | null) {
  if (!value) return "发布时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(value);
}

export function formatCalendarDate(value = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(value);
}
