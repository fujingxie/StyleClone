import { prisma } from "@/lib/db";
import { embedTexts } from "@/lib/embed";

const defaultTopK = 5;
const maxTopK = 12;

export type RetrievedChunk = {
  characterId: string;
  chunkId: string;
  chunkIndex: number;
  content: string;
  materialId: string;
  score: number;
  tokenCount: number;
};

type RetrieveRelevantChunksInput = {
  characterId: string;
  query: string;
  topK?: number;
};

function normalizeTopK(value: number | undefined) {
  if (!value || !Number.isFinite(value)) {
    return defaultTopK;
  }

  return Math.min(maxTopK, Math.max(1, Math.floor(value)));
}

function cosineSimilarity(left: number[], right: number[]) {
  if (left.length !== right.length || left.length === 0) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] * left[index];
    rightNorm += right[index] * right[index];
  }

  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function parseEmbeddingJson(value: string, chunkId: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "number")) {
      throw new Error("embeddingJson 不是 number[]");
    }

    return parsed;
  } catch (error) {
    console.error("[parseEmbeddingJson] failed", { chunkId, error }, new Date().toISOString());
    return null;
  }
}

export async function retrieveRelevantChunks({
  characterId,
  query,
  topK,
}: RetrieveRelevantChunksInput): Promise<RetrievedChunk[] | null> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    throw new Error("检索 query 不能为空");
  }

  const character = await prisma.character.findUnique({
    select: { id: true },
    where: { id: characterId },
  });

  if (!character) {
    return null;
  }

  const chunks = await prisma.chunk.findMany({
    orderBy: { chunkIndex: "asc" },
    select: {
      characterId: true,
      chunkIndex: true,
      content: true,
      embeddingJson: true,
      id: true,
      materialId: true,
      tokenCount: true,
    },
    where: { characterId },
  });

  if (chunks.length === 0) {
    return [];
  }

  const [queryEmbedding] = await embedTexts([trimmedQuery], "query");
  const limit = normalizeTopK(topK);

  return chunks
    .map((chunk) => {
      const embedding = parseEmbeddingJson(chunk.embeddingJson, chunk.id);

      if (!embedding) {
        return null;
      }

      return {
        characterId: chunk.characterId,
        chunkId: chunk.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        materialId: chunk.materialId,
        score: cosineSimilarity(queryEmbedding, embedding),
        tokenCount: chunk.tokenCount,
      };
    })
    .filter((chunk): chunk is RetrievedChunk => chunk !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}
