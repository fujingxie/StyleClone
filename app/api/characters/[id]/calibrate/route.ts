import { NextResponse } from "next/server";

import {
  generateCalibrationSample,
  normalizeStyleStrength,
  parseExtraExemplars,
  type CalibrationExemplar,
} from "@/lib/calibration";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

type CalibrationRequest = {
  extraExemplars?: unknown;
  saveExtraExemplars?: unknown;
  saveOnly?: unknown;
  styleStrength?: unknown;
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const body = (await request.json().catch(() => ({}))) as CalibrationRequest;
    const extraExemplarTexts = parseExtraExemplars(body.extraExemplars);
    const saveExtraExemplars = body.saveExtraExemplars === true;
    const saveOnly = body.saveOnly === true;
    const styleStrength = normalizeStyleStrength(body.styleStrength);

    const character = await prisma.character.findUnique({
      select: {
        category: true,
        id: true,
        name: true,
        status: true,
        styleSummary: true,
      },
      where: { id: params.id },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    if (character.status !== "ready") {
      return NextResponse.json({ error: "角色尚未训练完成，无法校准" }, { status: 409 });
    }

    const existingExemplars = await prisma.exemplar.findMany({
      orderBy: { createdAt: "asc" },
      select: { content: true, kind: true },
      where: { characterId: params.id },
    });
    const transientExemplars: CalibrationExemplar[] = extraExemplarTexts.map((content) => ({
      content,
      kind: "general",
    }));
    let sample: string | null = null;
    let savedExtraCount = 0;

    if (!saveOnly) {
      sample = await generateCalibrationSample({
        character,
        exemplars: [...existingExemplars, ...transientExemplars],
        styleStrength,
      });
    }

    if (saveExtraExemplars && extraExemplarTexts.length > 0) {
      const existingContent = new Set(existingExemplars.map((exemplar) => exemplar.content.trim()));
      const data = extraExemplarTexts
        .filter((content) => !existingContent.has(content))
        .map((content) => ({
          characterId: params.id,
          content,
          kind: "general",
          note: "风格校准补充范本",
        }));

      if (data.length > 0) {
        await prisma.exemplar.createMany({ data });
        savedExtraCount = data.length;
      }
    }

    const exemplarCount = await prisma.exemplar.count({
      where: { characterId: params.id },
    });

    return NextResponse.json({
      exemplarCount,
      sample,
      savedExtraCount,
      styleStrength,
    });
  } catch (error) {
    console.error(
      "[api/characters/:id/calibrate][POST] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "风格校准失败" }, { status: 500 });
  }
}
