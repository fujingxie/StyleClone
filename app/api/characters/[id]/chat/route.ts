import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { streamDeepSeekChat } from "@/lib/llm";
import { buildQaMessages } from "@/lib/prompt";
import { retrieveRelevantChunks } from "@/lib/retrieval";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const body = (await request.json()) as {
      message?: unknown;
      topK?: unknown;
    };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const topK = typeof body.topK === "number" ? body.topK : undefined;

    if (!message) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "角色尚未训练完成" }, { status: 409 });
    }

    const [retrievedChunks, exemplars] = await Promise.all([
      retrieveRelevantChunks({ characterId: params.id, query: message, topK }),
      prisma.exemplar.findMany({
        orderBy: { createdAt: "asc" },
        select: { content: true, kind: true },
        take: 12,
        where: { characterId: params.id },
      }),
    ]);

    if (!retrievedChunks) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const messages = buildQaMessages({
      character,
      exemplars,
      retrievedChunks,
      userMessage: message,
    });
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let answer = "";

        try {
          controller.enqueue(
            encoder.encode(
              encodeSse("context", {
                exemplarCount: exemplars.length,
                retrievedChunkCount: retrievedChunks.length,
              }),
            ),
          );

          for await (const delta of streamDeepSeekChat(messages)) {
            answer += delta;
            controller.enqueue(encoder.encode(encodeSse("delta", { text: delta })));
          }

          controller.enqueue(encoder.encode(encodeSse("done", { text: answer })));
        } catch (error) {
          console.error(
            "[api/characters/:id/chat][stream] failed",
            { characterId: params.id, error },
            new Date().toISOString(),
          );
          controller.enqueue(encoder.encode(encodeSse("error", { message: "生成回复失败" })));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream; charset=utf-8",
      },
    });
  } catch (error) {
    console.error(
      "[api/characters/:id/chat][POST] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "创建问答请求失败" }, { status: 500 });
  }
}
