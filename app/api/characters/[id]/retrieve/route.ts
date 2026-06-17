import { NextResponse } from "next/server";

import { retrieveRelevantChunks } from "@/lib/retrieval";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const body = (await request.json()) as {
      query?: unknown;
      topK?: unknown;
    };
    const query = typeof body.query === "string" ? body.query : "";
    const topK = typeof body.topK === "number" ? body.topK : undefined;

    if (!query.trim()) {
      return NextResponse.json({ error: "检索 query 不能为空" }, { status: 400 });
    }

    const chunks = await retrieveRelevantChunks({
      characterId: params.id,
      query,
      topK,
    });

    if (!chunks) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json({ chunks });
  } catch (error) {
    console.error(
      "[api/characters/:id/retrieve][POST] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "检索失败" }, { status: 500 });
  }
}
