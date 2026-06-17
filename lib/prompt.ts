import type { DeepSeekMessage } from "@/lib/llm";
import type { RetrievedChunk } from "@/lib/retrieval";

type PromptCharacter = {
  category: string;
  name: string;
  styleSummary: string | null;
};

type PromptExemplar = {
  content: string;
  kind: string;
};

const kindLabels: Record<string, string> = {
  close: "逼单",
  general: "通用",
  inter: "互动",
  obj: "异议处理",
  open: "开场",
  sell: "卖点",
};

function formatChunks(chunks: RetrievedChunk[]) {
  if (chunks.length === 0) {
    return "无命中片段。";
  }

  return chunks
    .map((chunk, index) =>
      [
        `【检索片段 ${index + 1} · score=${chunk.score.toFixed(4)}】`,
        chunk.content.trim(),
      ].join("\n"),
    )
    .join("\n\n");
}

function pickExemplars(exemplars: PromptExemplar[]) {
  return exemplars.slice(0, 6);
}

export function buildQaMessages(input: {
  character: PromptCharacter;
  exemplars: PromptExemplar[];
  retrievedChunks: RetrievedChunk[];
  userMessage: string;
}): DeepSeekMessage[] {
  const messages: DeepSeekMessage[] = [
    {
      role: "system",
      content: [
        `你是「${input.character.name}」的直播带货主播分身。`,
        `类目：${input.character.category}。`,
        input.character.styleSummary ? `风格摘要：${input.character.styleSummary}` : "风格摘要：暂无。",
        "回答必须使用中文直播口语，像主播现场对家人们说话。",
        "优先使用检索片段中的事实和措辞，不要编造素材中没有的商品参数、价格、库存或承诺。",
        "如果素材不足，明确说“基于已有素材可以这样讲”，再给可用话术。",
        "输出直接可复制的话术，不解释你用了哪些资料。",
      ].join("\n"),
    },
  ];

  for (const exemplar of pickExemplars(input.exemplars)) {
    messages.push(
      {
        role: "user",
        content: `风格范本类型：${kindLabels[exemplar.kind] ?? "通用"}。请输出该类型的一段直播话术。`,
      },
      {
        role: "assistant",
        content: exemplar.content,
      },
    );
  }

  messages.push({
    role: "user",
    content: [
      `用户问题：${input.userMessage}`,
      "",
      "请参考以下检索片段回答：",
      formatChunks(input.retrievedChunks),
      "",
      "要求：回答 1-3 段，尽量保持原主播口吻，能直接用于直播间。",
    ].join("\n"),
  });

  return messages;
}
