type VoyageEmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
    index?: number;
  }>;
};

const voyageEmbeddingsUrl = "https://api.voyageai.com/v1/embeddings";

function requireVoyageApiKey() {
  const apiKey = process.env.VOYAGE_API_KEY;

  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY 未配置，无法向量化素材");
  }

  return apiKey;
}

export async function embedTexts(texts: string[], inputType: "document" | "query" = "document") {
  if (texts.length === 0) {
    return [];
  }

  const apiKey = requireVoyageApiKey();
  const model = process.env.VOYAGE_EMBED_MODEL || "voyage-3.5";

  try {
    const response = await fetch(voyageEmbeddingsUrl, {
      body: JSON.stringify({
        input: texts,
        input_type: inputType,
        model,
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Voyage embeddings ${response.status}: ${detail.slice(0, 240)}`);
    }

    const payload = (await response.json()) as VoyageEmbeddingResponse;
    const rows = payload.data ?? [];
    const embeddings = rows
      .slice()
      .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
      .map((row) => row.embedding);

    if (embeddings.length !== texts.length || embeddings.some((embedding) => !embedding?.length)) {
      throw new Error(`Voyage embeddings 返回数量异常：expected=${texts.length}, actual=${embeddings.length}`);
    }

    return embeddings as number[][];
  } catch (error) {
    console.error("[embedTexts] failed", { error, count: texts.length, inputType, model }, new Date().toISOString());
    throw error;
  }
}
