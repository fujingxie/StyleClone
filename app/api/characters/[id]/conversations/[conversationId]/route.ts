import { NextResponse } from "next/server";

import { deleteConversation, renameConversation } from "@/lib/conversations";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    conversationId: string;
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown;
    };
    const title = typeof body.title === "string" ? body.title.trim() : "";

    if (!title) {
      return NextResponse.json({ error: "会话名称不能为空" }, { status: 400 });
    }

    const conversation = await renameConversation({
      characterId: params.id,
      conversationId: params.conversationId,
      title,
    });

    if (!conversation) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    return NextResponse.json({
      conversation,
    });
  } catch (error) {
    console.error(
      "[api/characters/:id/conversations/:conversationId][PATCH] failed",
      { characterId: params.id, conversationId: params.conversationId, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "重命名会话失败" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const conversation = await deleteConversation({
      characterId: params.id,
      conversationId: params.conversationId,
    });

    if (!conversation) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "[api/characters/:id/conversations/:conversationId][DELETE] failed",
      { characterId: params.id, conversationId: params.conversationId, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "删除会话失败" }, { status: 500 });
  }
}
