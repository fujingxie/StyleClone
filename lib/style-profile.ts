import { createDeepSeekJsonChat } from "@/lib/llm";

const allowedKinds = new Set(["open", "sell", "inter", "obj", "close", "general"]);
const kindAliases: Record<string, string> = {
  开场: "open",
  开场白: "open",
  卖点: "sell",
  产品卖点: "sell",
  互动: "inter",
  互动话术: "inter",
  异议: "obj",
  异议处理: "obj",
  逼单: "close",
  收口: "close",
  通用: "general",
};

export type StyleExemplar = {
  content: string;
  kind: string;
  note?: string;
};

export type StyleProfile = {
  exemplars: StyleExemplar[];
  styleSummary: string;
};

type RawStyleProfile = {
  exemplars?: Array<{
    content?: unknown;
    kind?: unknown;
    note?: unknown;
  }>;
  styleSummary?: unknown;
  style_summary?: unknown;
};

function normalizeKind(value: unknown) {
  if (typeof value !== "string") {
    return "general";
  }

  const trimmed = value.trim();
  const aliased = kindAliases[trimmed] ?? trimmed;

  return allowedKinds.has(aliased) ? aliased : "general";
}

function parseJsonObject(content: string) {
  try {
    return JSON.parse(content) as RawStyleProfile;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("DeepSeek 返回的风格画像不是 JSON 对象");
    }

    return JSON.parse(match[0]) as RawStyleProfile;
  }
}

function sanitizeStyleProfile(raw: RawStyleProfile): StyleProfile {
  const styleSummary = typeof raw.styleSummary === "string" ? raw.styleSummary : raw.style_summary;
  const summary = typeof styleSummary === "string" ? styleSummary.trim() : "";

  if (!summary) {
    throw new Error("DeepSeek 未返回 styleSummary");
  }

  const exemplars = (raw.exemplars ?? [])
    .map((item) => ({
      content: typeof item.content === "string" ? item.content.trim() : "",
      kind: normalizeKind(item.kind),
      note: typeof item.note === "string" ? item.note.trim() : undefined,
    }))
    .filter((item) => item.content.length > 0)
    .slice(0, 20);

  if (exemplars.length === 0) {
    throw new Error("DeepSeek 未返回有效范本");
  }

  return {
    exemplars,
    styleSummary: summary.slice(0, 2000),
  };
}

function pickStyleSamples(chunks: string[]) {
  const samples: string[] = [];
  let totalLength = 0;

  for (const chunk of chunks) {
    if (totalLength >= 12_000) {
      break;
    }

    const sample = chunk.trim();

    if (!sample) {
      continue;
    }

    samples.push(sample);
    totalLength += sample.length;
  }

  return samples;
}

export async function extractStyleProfile(input: {
  category: string;
  characterName: string;
  chunks: string[];
}) {
  const samples = pickStyleSamples(input.chunks);

  if (samples.length === 0) {
    throw new Error("缺少可用于抽风格的素材切片");
  }

  const content = await createDeepSeekJsonChat([
    {
      role: "system",
      content:
        "你是直播带货文案分析助手。只输出 JSON 对象，不要 Markdown。JSON 必须包含 styleSummary 和 exemplars。",
    },
    {
      role: "user",
      content: [
        `角色名称：${input.characterName}`,
        `类目：${input.category}`,
        "任务：从素材中抽取主播说话风格，生成简短风格摘要，并挑选 10-20 条最典型原话作为范本。",
        "kind 只能使用：open、sell、inter、obj、close、general。",
        "返回格式：{\"styleSummary\":\"...\",\"exemplars\":[{\"kind\":\"sell\",\"content\":\"原话\",\"note\":\"为什么典型\"}]}",
        "要求：content 尽量使用素材原话，不要编造商品信息；styleSummary 描述口吻、节奏、常用句式、互动方式和禁忌。",
        "",
        "素材切片：",
        samples.map((sample, index) => `【片段 ${index + 1}】\n${sample}`).join("\n\n"),
      ].join("\n"),
    },
  ]);

  return sanitizeStyleProfile(parseJsonObject(content));
}
