import type { Material } from "@prisma/client";

import { prisma } from "@/lib/db";
import { embedTexts } from "@/lib/embed";
import { extractStyleProfile } from "@/lib/style-profile";

const maxUploadChars = 300_000;
const minUploadChars = 20;
const chunkSize = 900;
const chunkOverlap = 120;

type TrainMaterialInput = {
  characterId: string;
  filename: string;
  text: string;
};

export type TrainingStatus = {
  characterId: string;
  chunkCount: number;
  errorMessage: string | null;
  exemplarCount: number;
  filename: string | null;
  materialId: string | null;
  progress: number;
  stage: string;
  styleSummary: string | null;
  status: "training" | "ready" | "error";
  wordCount: number;
};

export function normalizeUploadedText(text: string) {
  return text.replace(/\r\n?/g, "\n").trim();
}

export function estimateTextUnits(text: string) {
  const compact = text.replace(/\s+/g, "");
  return compact.length;
}

export function estimateTokenCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 2));
}

export function splitTextIntoChunks(text: string) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  function pushLongText(value: string) {
    const step = Math.max(1, chunkSize - chunkOverlap);

    for (let start = 0; start < value.length; start += step) {
      chunks.push(value.slice(start, start + chunkSize).trim());
    }
  }

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      if (current) {
        chunks.push(current);
        current = "";
      }

      pushLongText(paragraph);
      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;

    if (next.length > chunkSize) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks.filter((chunk) => chunk.length > 0);
}

export function serializeMaterial(material: Material, chunkCount = 0) {
  return {
    id: material.id,
    characterId: material.characterId,
    filename: material.filename,
    wordCount: material.wordCount,
    status: material.status,
    stage: material.stage,
    progress: material.progress,
    errorMessage: material.errorMessage,
    chunkCount,
    uploadedAt: material.uploadedAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
  };
}

export async function getTrainingStatus(characterId: string): Promise<TrainingStatus | null> {
  const character = await prisma.character.findUnique({
    select: { id: true, status: true, styleSummary: true },
    where: { id: characterId },
  });

  if (!character) {
    return null;
  }

  const material = await prisma.material.findFirst({
    orderBy: { uploadedAt: "desc" },
    where: { characterId },
  });

  if (!material) {
    return {
      characterId,
      chunkCount: 0,
      errorMessage: null,
      exemplarCount: 0,
      filename: null,
      materialId: null,
      progress: character.status === "ready" ? 100 : 0,
      stage: character.status === "training" ? "等待素材" : "未上传",
      styleSummary: character.styleSummary,
      status: character.status as TrainingStatus["status"],
      wordCount: 0,
    };
  }

  const [chunkCount, exemplarCount] = await Promise.all([
    prisma.chunk.count({ where: { materialId: material.id } }),
    prisma.exemplar.count({ where: { sourceMaterialId: material.id } }),
  ]);

  return {
    characterId,
    chunkCount,
    errorMessage: material.errorMessage,
    exemplarCount,
    filename: material.filename,
    materialId: material.id,
    progress: material.progress,
    stage: material.stage,
    styleSummary: character.styleSummary,
    status: material.status as TrainingStatus["status"],
    wordCount: material.wordCount,
  };
}

export async function trainCharacterMaterial({ characterId, filename, text }: TrainMaterialInput) {
  const rawText = normalizeUploadedText(text);
  const wordCount = estimateTextUnits(rawText);

  if (wordCount < minUploadChars) {
    throw new Error(`素材内容过短，至少需要 ${minUploadChars} 个有效字符`);
  }

  if (rawText.length > maxUploadChars) {
    throw new Error(`素材内容过长，当前上限为 ${maxUploadChars} 个字符`);
  }

  const character = await prisma.character.findUnique({
    select: { category: true, id: true, name: true },
    where: { id: characterId },
  });

  if (!character) {
    return null;
  }

  const safeFilename = filename.trim() || "直播稿素材.txt";
  const material = await prisma.material.create({
    data: {
      characterId,
      filename: safeFilename,
      progress: 10,
      rawText,
      stage: "切片",
      status: "training",
      wordCount,
    },
  });

  try {
    await prisma.character.update({
      data: { status: "training" },
      where: { id: characterId },
    });

    const chunks = splitTextIntoChunks(rawText);

    if (chunks.length === 0) {
      throw new Error("素材切片为空，请上传有效文本");
    }

    await prisma.material.update({
      data: { progress: 35, stage: "向量化" },
      where: { id: material.id },
    });

    const embeddings = await embedTexts(chunks, "document");

    const chunkRows = chunks.map((content, index) => ({
      characterId,
      chunkIndex: index,
      content,
      embeddingJson: JSON.stringify(embeddings[index]),
      materialId: material.id,
      tokenCount: estimateTokenCount(content),
    }));

    await prisma.$transaction([
      prisma.chunk.deleteMany({ where: { materialId: material.id } }),
      prisma.chunk.createMany({ data: chunkRows }),
      prisma.material.update({
        data: { progress: 70, stage: "抽风格" },
        where: { id: material.id },
      }),
    ]);

    const styleProfile = await extractStyleProfile({
      category: character.category,
      characterName: character.name,
      chunks,
    });

    await prisma.material.update({
      data: { progress: 88, stage: "抽范本" },
      where: { id: material.id },
    });

    const exemplarRows = styleProfile.exemplars.map((exemplar) => ({
      characterId,
      content: exemplar.content,
      kind: exemplar.kind,
      note: exemplar.note,
      sourceMaterialId: material.id,
    }));

    const [, , updatedMaterial] = await prisma.$transaction([
      prisma.exemplar.deleteMany({ where: { sourceMaterialId: material.id } }),
      prisma.exemplar.createMany({ data: exemplarRows }),
      prisma.material.update({
        data: {
          errorMessage: null,
          progress: 100,
          stage: "完成",
          status: "ready",
        },
        where: { id: material.id },
      }),
      prisma.character.update({
        data: {
          status: "ready",
          styleSummary: styleProfile.styleSummary,
        },
        where: { id: characterId },
      }),
    ]);

    return {
      chunkCount: chunkRows.length,
      exemplarCount: exemplarRows.length,
      material: serializeMaterial(updatedMaterial, chunkRows.length),
      styleSummary: styleProfile.styleSummary,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "素材训练失败";

    console.error(
      "[trainCharacterMaterial] failed",
      { characterId, error, materialId: material.id },
      new Date().toISOString(),
    );

    await prisma.$transaction([
      prisma.material.update({
        data: {
          errorMessage,
          progress: 0,
          stage: "失败",
          status: "error",
        },
        where: { id: material.id },
      }),
      prisma.exemplar.deleteMany({
        where: { sourceMaterialId: material.id },
      }),
      prisma.character.update({
        data: { status: "error" },
        where: { id: characterId },
      }),
    ]);

    throw new Error(errorMessage);
  }
}
