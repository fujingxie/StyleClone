import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.exemplar.deleteMany({ where: { characterId: params.id } });
      await tx.chunk.deleteMany({ where: { characterId: params.id } });
      await tx.material.deleteMany({ where: { characterId: params.id } });

      return tx.character.deleteMany({
        where: { id: params.id },
      });
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(
      "[api/characters/:id][DELETE] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "删除角色失败" }, { status: 500 });
  }
}
