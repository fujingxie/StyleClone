import { NextResponse } from "next/server";

import { beginAutoSession, isAutoSessionStopped } from "@/lib/auto-sessions";
import {
  type AutoScriptSegment,
  buildAutoScriptMessages,
  getAutoScriptKind,
} from "@/lib/autoscript";
import { appendConversationMessage, createConversation, getConversationById } from "@/lib/conversations";
import { prisma } from "@/lib/db";
import { streamDeepSeekChat } from "@/lib/llm";
import { retrieveRelevantChunks } from "@/lib/retrieval";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

const defaultMaxSegments = 12;
const hardMaxSegments = 24;

const kindQueries = {
  close: "逼单 下单 限时 名额 福利 成交",
  inter: "互动 扣1 家人们 评论 直播间",
  open: "开场 欢迎 新进直播间 家人们",
  sell: "卖点 产品 介绍 材质 品质",
};

function encodeSse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function normalizeMaxSegments(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return defaultMaxSegments;
  }

  return Math.min(hardMaxSegments, Math.max(1, Math.floor(value)));
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      conversationId?: unknown;
      maxSegments?: unknown;
    };
    const maxSegments = normalizeMaxSegments(body.maxSegments);
    const requestedConversationId = typeof body.conversationId === "string" ? body.conversationId.trim() : "";
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

    const exemplars = await prisma.exemplar.findMany({
      orderBy: { createdAt: "asc" },
      select: { content: true, kind: true },
      take: 20,
      where: { characterId: params.id },
    });
    const existingConversation = requestedConversationId
      ? await getConversationById({
          characterId: params.id,
          conversationId: requestedConversationId,
          mode: "auto",
        })
      : null;

    if (requestedConversationId && !existingConversation) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    const conversation =
      existingConversation ??
      (await createConversation({
        characterId: params.id,
        mode: "auto",
        title: `自动台词 ${new Date().toLocaleString("zh-CN", { hour12: false })}`,
      }));
    const sessionId = beginAutoSession(params.id);
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const previousSegments: AutoScriptSegment[] = [];

        try {
          controller.enqueue(
            encoder.encode(
              encodeSse("start", {
                conversationId: conversation.id,
                maxSegments,
                sessionId,
              }),
            ),
          );

          for (let index = 0; index < maxSegments; index += 1) {
            if (request.signal.aborted || isAutoSessionStopped(params.id, sessionId)) {
              break;
            }

            const kind = getAutoScriptKind(index);
            const segmentId = `${sessionId}-${index}`;
            let text = "";
            const retrievedChunks =
              (await retrieveRelevantChunks({
                characterId: params.id,
                query: `${character.category} ${kindQueries[kind]}`,
                topK: 3,
              })) ?? [];
            const messages = buildAutoScriptMessages({
              character,
              exemplars,
              kind,
              previousSegments,
              retrievedChunks,
              segmentIndex: index,
            });

            controller.enqueue(encoder.encode(encodeSse("segment-start", { id: segmentId, index, kind })));

            for await (const delta of streamDeepSeekChat(messages)) {
              if (request.signal.aborted || isAutoSessionStopped(params.id, sessionId)) {
                break;
              }

              text += delta;
              controller.enqueue(encoder.encode(encodeSse("delta", { id: segmentId, text: delta })));
            }

            if (!text.trim()) {
              break;
            }

            const segment = { kind, text: text.trim() };
            previousSegments.push(segment);
            const savedMessage = await appendConversationMessage({
              characterId: params.id,
              content: segment.text,
              conversationId: conversation.id,
              kind: segment.kind,
              role: "auto",
            });
            controller.enqueue(
              encoder.encode(
                encodeSse("segment-done", {
                  conversationId: conversation.id,
                  id: segmentId,
                  index,
                  kind,
                  messageId: savedMessage.id,
                  text: segment.text,
                }),
              ),
            );
          }

          controller.enqueue(encoder.encode(encodeSse("done", { generatedCount: previousSegments.length })));
        } catch (error) {
          console.error(
            "[api/characters/:id/auto/start][stream] failed",
            { characterId: params.id, error },
            new Date().toISOString(),
          );
          controller.enqueue(encoder.encode(encodeSse("error", { message: "自动生成失败" })));
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
      "[api/characters/:id/auto/start][POST] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "启动自动生成失败" }, { status: 500 });
  }
}
