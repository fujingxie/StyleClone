import { NextResponse } from "next/server";

import { getTrainingStatus } from "@/lib/training";

export const runtime = "nodejs";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const status = await getTrainingStatus(params.id);

    if (!status) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error(
      "[api/characters/:id/training-status][GET] failed",
      { characterId: params.id, error },
      new Date().toISOString(),
    );

    return NextResponse.json({ error: "读取训练状态失败" }, { status: 500 });
  }
}
