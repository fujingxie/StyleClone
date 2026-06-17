import type { DeepSeekMessage } from "@/lib/llm";
import type { RetrievedChunk } from "@/lib/retrieval";

export type AutoScriptKind = "open" | "sell" | "inter" | "close";

export type AutoScriptSegment = {
  kind: AutoScriptKind;
  text: string;
};

type AutoScriptCharacter = {
  category: string;
  name: string;
  styleSummary: string | null;
};

type AutoScriptExemplar = {
  content: string;
  kind: string;
};

const kindCycle: AutoScriptKind[] = ["open", "sell", "inter", "close"];

const kindLabels: Record<AutoScriptKind, string> = {
  close: "逼单",
  inter: "互动",
  open: "开场",
  sell: "卖点",
};

export function getAutoScriptKind(index: number) {
  return kindCycle[index % kindCycle.length];
}

function formatRetrievedChunks(chunks: RetrievedChunk[]) {
  if (chunks.length === 0) {
    return "无命中片段。";
  }

  return chunks
    .map((chunk, index) => `【素材 ${index + 1}】\n${chunk.content.trim()}`)
    .join("\n\n");
}

function formatPreviousSegments(segments: AutoScriptSegment[]) {
  if (segments.length === 0) {
    return "暂无上一段，从当前类型自然开始。";
  }

  return segments
    .slice(-3)
    .map((segment, index) => `【前文 ${index + 1} · ${kindLabels[segment.kind]}】\n${segment.text}`)
    .join("\n\n");
}

function pickExemplars(exemplars: AutoScriptExemplar[], kind: AutoScriptKind) {
  const exact = exemplars.filter((exemplar) => exemplar.kind === kind).slice(0, 3);
  const general = exemplars.filter((exemplar) => exemplar.kind === "general").slice(0, 2);
  const fallback = exemplars.filter((exemplar) => exemplar.kind !== kind && exemplar.kind !== "general").slice(0, 2);

  return [...exact, ...general, ...fallback].slice(0, 5);
}

export function buildAutoScriptMessages(input: {
  character: AutoScriptCharacter;
  exemplars: AutoScriptExemplar[];
  kind: AutoScriptKind;
  previousSegments: AutoScriptSegment[];
  retrievedChunks: RetrievedChunk[];
  segmentIndex: number;
}): DeepSeekMessage[] {
  const kindLabel = kindLabels[input.kind];
  const pickedExemplars = pickExemplars(input.exemplars, input.kind);

  return [
    {
      role: "system",
      content: [
        `你是「${input.character.name}」的直播带货主播分身。`,
        `类目：${input.character.category}。`,
        input.character.styleSummary ? `风格摘要：${input.character.styleSummary}` : "风格摘要：暂无。",
        "你正在连续滚动生成直播间台词，每次只输出当前这一段。",
        "必须使用中文直播口语，像主播现场对家人们说话。",
        "优先使用素材中的事实和措辞，不要编造素材中没有的价格、库存、功效或承诺。",
        "不要解释、不要列点、不要加标题，直接输出可复制的一段直播话术。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        `当前要生成第 ${input.segmentIndex + 1} 段，类型：${kindLabel}。`,
        "",
        "上一轮上下文：",
        formatPreviousSegments(input.previousSegments),
        "",
        "可参考素材：",
        formatRetrievedChunks(input.retrievedChunks),
        "",
        "该主播典型原话范本：",
        pickedExemplars.length > 0
          ? pickedExemplars.map((exemplar, index) => `【范本 ${index + 1}】${exemplar.content}`).join("\n")
          : "暂无范本。",
        "",
        "要求：生成 1 段，60-120 字，和前文连贯，不重复前文句子。",
      ].join("\n"),
    },
  ];
}
