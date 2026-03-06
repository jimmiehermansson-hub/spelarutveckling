import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const QuerySchema = z.object({
  exerciseId: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: playerId } = await params;
    const { searchParams } = new URL(req.url);

    const parsedQuery = QuerySchema.safeParse({
      exerciseId: searchParams.get("exerciseId") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          error: "Invalid query params",
          details: parsedQuery.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { exerciseId } = parsedQuery.data;

    const measurements = await prisma.measurement.findMany({
      where: {
        playerId,
        ...(exerciseId ? { exerciseId } : {}),
      },
      orderBy: {
        date: "asc",
      },
      select: {
        id: true,
        date: true,
        value: true,
        exerciseId: true,
        exercise: {
          select: {
            name: true,
            unit: true,
          },
        },
      },
    });

    const result = measurements.map((m) => ({
      id: m.id,
      date: m.date.toISOString().slice(0, 10),
      value: m.value,
      exerciseId: m.exerciseId,
      exerciseName: m.exercise.name,
      unit: m.exercise.unit,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("GET /api/players/[id]/measurements failed:", error);

    return NextResponse.json(
      {
        error: "Failed to load player measurements",
        details: error?.message ?? String(error),
      },
      { status: 500 },
    );
  }
}
