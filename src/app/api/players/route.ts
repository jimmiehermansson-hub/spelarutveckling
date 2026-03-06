import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const teamId = url.searchParams.get("teamId");

  const players = await prisma.player.findMany({
    where: {
      isActive: true,
      ...(teamId ? { teamId } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(players);
}
