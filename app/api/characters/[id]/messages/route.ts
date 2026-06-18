import { NextResponse } from "next/server";

import {
  getConversationMessages,
  getLatestConversationMessages,
  type ConversationMode,
} from "@/lib/conversations";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

function parseMode(value: string | null): ConversationMode {
  return value === "auto" ? "auto" : "chat";
}

function parseLimit(value: string | null) {
  if (!value) {
    return undefined;
  }

  const limit = Number(value);
  return Number.isFinite(limit) ? limit : undefined;
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");
    const mode = parseMode(url.searchParams.get("mode"));
    const limit = parseLimit(url.searchParams.get("limit"));
    const character = await prisma.character.findUnique({
      select: { id: true },
      where: { id: params.id },
    });

    if (!character) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const history = conversationId
      ? await getConversationMessages({
          characterId: params.id,
          conversationId,
          limit,
          mode,
        })
      : await getLatestConversationMessages({
          characterId: params.id,
          limit,
          mode,
        });

    if (!history) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    return NextResponse.json(history);
  } catch (error) {
    console.error(
      "[api/characters/:id/messages][GET] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "读取消息历史失败" }, { status: 500 });
  }
}
