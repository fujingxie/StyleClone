import { createDeepSeekJsonChat, type DeepSeekMessage } from "@/lib/llm";

type CalibrationCharacter = {
  category: string;
  name: string;
  styleSummary: string | null;
};

export type CalibrationExemplar = {
  content: string;
  kind: string;
};

type CalibrationSampleResponse = {
  sample?: unknown;
};

const maxExtraExemplarCount = 8;
const maxExtraExemplarLength = 260;

const kindLabels: Record<string, string> = {
  close: "逼单",
  general: "通用",
  inter: "互动",
  obj: "异议处理",
  open: "开场",
  sell: "卖点",
};

export function normalizeStyleStrength(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 4;
  }

  return Math.min(5, Math.max(1, Math.round(value)));
}

export function parseExtraExemplars(value: unknown) {
  const rawItems = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? value.split(/\n+/)
      : [];
  const seen = new Set<string>();
  const exemplars: string[] = [];

  for (const item of rawItems) {
    const content = item.replace(/\s+/g, " ").trim().slice(0, maxExtraExemplarLength);

    if (!content || seen.has(content)) {
      continue;
    }

    seen.add(content);
    exemplars.push(content);

    if (exemplars.length >= maxExtraExemplarCount) {
      break;
    }
  }

  return exemplars;
}

function getStrengthInstruction(styleStrength: number) {
  const instructions: Record<number, string> = {
    1: "风格只做轻微参考，表达自然，不强行复用原话。",
    2: "保留部分语气和节奏，但允许更清晰地改写。",
    3: "风格和清晰度均衡，复用少量高频口头禅。",
    4: "明显贴近主播口吻，优先复用典型句式和节奏。",
    5: "高度贴近原话风格，尽量复用口头禅、停顿感和带货节奏。",
  };

  return instructions[styleStrength] ?? instructions[4];
}

function formatExemplars(exemplars: CalibrationExemplar[]) {
  if (exemplars.length === 0) {
    return "暂无范本。";
  }

  return exemplars
    .slice(-12)
    .map((exemplar, index) =>
      [`【范本 ${index + 1} · ${kindLabels[exemplar.kind] ?? "通用"}】`, exemplar.content.trim()].join("\n"),
    )
    .join("\n\n");
}

function parseSample(content: string) {
  const parsed = JSON.parse(content) as CalibrationSampleResponse;
  const sample = typeof parsed.sample === "string" ? parsed.sample.trim() : "";

  if (!sample) {
    throw new Error("DeepSeek 校准样例为空");
  }

  return sample;
}

export async function generateCalibrationSample(input: {
  character: CalibrationCharacter;
  exemplars: CalibrationExemplar[];
  styleStrength: number;
}) {
  const messages: DeepSeekMessage[] = [
    {
      role: "system",
      content: [
        `你是「${input.character.name}」的直播带货主播分身风格校准器。`,
        `类目：${input.character.category}。`,
        input.character.styleSummary ? `风格摘要：${input.character.styleSummary}` : "风格摘要：暂无。",
        "你只输出 JSON 对象，不要输出 Markdown。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "请生成一段用于校准的直播口播样例。",
        `风格强度：${input.styleStrength}/5。${getStrengthInstruction(input.styleStrength)}`,
        "",
        "主播原话范本：",
        formatExemplars(input.exemplars),
        "",
        "要求：",
        "- 输出字段只能是 sample。",
        "- sample 为中文直播口语，90-140 字。",
        "- 不要编造素材中没有的具体价格、功效、库存或承诺。",
        "- 不要解释生成依据，不要加标题。",
      ].join("\n"),
    },
  ];

  try {
    const content = await createDeepSeekJsonChat(messages);
    return parseSample(content);
  } catch (error) {
    console.error(
      "[generateCalibrationSample] failed",
      { characterName: input.character.name, error },
      new Date().toISOString(),
    );
    throw error;
  }
}
