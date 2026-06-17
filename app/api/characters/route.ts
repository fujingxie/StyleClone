import { NextResponse } from "next/server";

import {
  getAvatarColor,
  getAvatarLetter,
  normalizeCategory,
  normalizeStatus,
  serializeCharacter,
} from "@/lib/characters";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const characters = await prisma.character.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ characters: characters.map(serializeCharacter) });
  } catch (error) {
    console.error("[api/characters][GET] failed", { error }, new Date().toISOString());
    return NextResponse.json({ error: "读取角色列表失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      category?: unknown;
      name?: unknown;
      status?: unknown;
      type?: unknown;
    };
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!name) {
      return NextResponse.json({ error: "角色名称不能为空" }, { status: 400 });
    }

    const category = normalizeCategory(body.category);
    const status = typeof body.status === "string" ? normalizeStatus(body.status) : "training";
    const character = await prisma.character.create({
      data: {
        name,
        category,
        type: typeof body.type === "string" && body.type.trim() ? body.type.trim() : "主播",
        status,
        avatarLetter: getAvatarLetter(name),
        avatarColor: getAvatarColor(category),
      },
    });

    return NextResponse.json({ character: serializeCharacter(character) }, { status: 201 });
  } catch (error) {
    console.error("[api/characters][POST] failed", { error }, new Date().toISOString());
    return NextResponse.json({ error: "创建角色失败" }, { status: 500 });
  }
}
