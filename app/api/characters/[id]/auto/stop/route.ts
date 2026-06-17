import { NextResponse } from "next/server";

import { stopAutoSession } from "@/lib/auto-sessions";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    return NextResponse.json({ ok: true, stopped: stopAutoSession(params.id) });
  } catch (error) {
    console.error(
      "[api/characters/:id/auto/stop][POST] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "停止自动生成失败" }, { status: 500 });
  }
}
