import { NextResponse } from "next/server";

import { trainCharacterMaterial } from "@/lib/training";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

async function readUploadRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    const text = formData.get("text");

    if (file instanceof File) {
      return {
        filename: file.name,
        text: await file.text(),
      };
    }

    return {
      filename: typeof formData.get("filename") === "string" ? String(formData.get("filename")) : "粘贴素材.txt",
      text: typeof text === "string" ? text : "",
    };
  }

  const body = (await request.json()) as {
    filename?: unknown;
    text?: unknown;
  };

  return {
    filename: typeof body.filename === "string" ? body.filename : "粘贴素材.txt",
    text: typeof body.text === "string" ? body.text : "",
  };
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const upload = await readUploadRequest(request);

    if (!upload.text.trim()) {
      return NextResponse.json({ error: "素材内容不能为空" }, { status: 400 });
    }

    const result = await trainCharacterMaterial({
      characterId: params.id,
      filename: upload.filename,
      text: upload.text,
    });

    if (!result) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json(
      {
        chunkCount: result.chunkCount,
        exemplarCount: result.exemplarCount,
        material: result.material,
        status: {
          chunkCount: result.chunkCount,
          exemplarCount: result.exemplarCount,
          materialId: result.material.id,
          progress: result.material.progress,
          stage: result.material.stage,
          styleSummary: result.styleSummary,
          status: result.material.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "素材训练失败";

    console.error(
      "[api/characters/:id/materials][POST] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
