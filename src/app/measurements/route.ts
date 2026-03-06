import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const MeasurementSchema = z.object({
  playerId: z.string().min(1),
  exerciseId: z.string().min(1),
  date: z.string().min(1),
  value: z.coerce.number(),
  source: z.string().optional(),
  createdBy: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = MeasurementSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { playerId, exerciseId, date, value, source, createdBy } =
      parsed.data;

    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    const measurement = await prisma.measurement.upsert({
      where: {
        playerId_exerciseId_date: {
          playerId,
          exerciseId,
          date: dateOnly,
        },
      },
      update: {
        value,
        source: source ?? "manual",
        createdBy: createdBy ?? "coach",
      },
      create: {
        playerId,
        exerciseId,
        date: dateOnly,
        value,
        source: source ?? "manual",
        createdBy: createdBy ?? "coach",
      },
    });

    return NextResponse.json({
      success: true,
      measurement,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save measurement" },
      { status: 500 },
    );
  }
}
