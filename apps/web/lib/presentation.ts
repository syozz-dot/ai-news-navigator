import type { StoryStatus } from "./queries";

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
