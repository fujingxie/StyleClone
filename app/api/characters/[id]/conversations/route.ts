import { NextResponse } from "next/server";

import { createConversation, listConversations, type ConversationMode } from "@/lib/conversations";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

function parseMode(value: unknown): ConversationMode {
  return value === "auto" ? "auto" : "chat";
}

function parseLimit(value: string | null) {
  if (!value) {
    return undefined;
  }

  const limit = Number(value);
  return Number.isFinite(limit) ? limit : undefined;
}

async function ensureCharacter(characterId: string) {
  return prisma.character.findUnique({
    select: { id: true },
    where: { id: characterId },
  });
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const url = new URL(request.url);
    const mode = parseMode(url.searchParams.get("mode"));
    const limit = parseLimit(url.searchParams.get("limit"));
    const character = await ensureCharacter(params.id);

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const conversations = await listConversations({
      characterId: params.id,
      limit,
      mode,
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error(
      "[api/characters/:id/conversations][GET] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "读取会话列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      mode?: unknown;
      title?: unknown;
    };
    const mode = parseMode(body.mode);
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 60) : undefined;
    const character = await ensureCharacter(params.id);

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const conversation = await createConversation({
      characterId: params.id,
      mode,
      title: title || (mode === "auto" ? "新的自动台词" : "新的问答"),
    });

    return NextResponse.json(
      {
        conversation: {
          createdAt: conversation.createdAt.toISOString(),
          id: conversation.id,
          latestMessagePreview: null,
          messageCount: 0,
          mode: conversation.mode,
          title: conversation.title,
          updatedAt: conversation.updatedAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "[api/characters/:id/conversations][POST] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "创建会话失败" }, { status: 500 });
  }
}
