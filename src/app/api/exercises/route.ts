import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const allowedDirections = ["HIGHER_BETTER", "LOWER_BETTER"] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const exercises = await prisma.exercise.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("GET /api/exercises failed:", error);
    return NextResponse.json(
      { error: "Kunde inte hämta övningar." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const direction = body.direction;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
    const isCore = typeof body.isCore === "boolean" ? body.isCore : false;

    const bestValue = Number(body.bestValue);
    const worstValue = Number(body.worstValue);

    if (!name) {
      return NextResponse.json(
        { error: "Namn måste fyllas i." },
        { status: 400 },
      );
    }

    if (!allowedDirections.includes(direction)) {
      return NextResponse.json(
        { error: "Ogiltigt värde för riktning." },
        { status: 400 },
      );
    }

    if (Number.isNaN(bestValue) || Number.isNaN(worstValue)) {
      return NextResponse.json(
        { error: "Best value och worst value måste vara siffror." },
        { status: 400 },
      );
    }

    if (bestValue === worstValue) {
      return NextResponse.json(
        { error: "Best value och worst value får inte vara samma." },
        { status: 400 },
      );
    }

    if (direction === "HIGHER_BETTER" && bestValue <= worstValue) {
      return NextResponse.json(
        {
          error:
            "När högre värde är bättre måste best value vara större än worst value.",
        },
        { status: 400 },
      );
    }

    if (direction === "LOWER_BETTER" && bestValue >= worstValue) {
      return NextResponse.json(
        {
          error:
            "När lägre värde är bättre måste best value vara mindre än worst value.",
        },
        { status: 400 },
      );
    }

    const existingExercise = await prisma.exercise.findFirst({
      where: {
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
    });

    if (existingExercise) {
      return NextResponse.json(
        { error: "Det finns redan en övning med detta namn." },
        { status: 409 },
      );
    }

    const exercise = await prisma.exercise.create({
      data: {
        id: randomUUID(),
        name,
        direction,
        isActive,
        isCore,
        bestValue,
        worstValue,
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    console.error("POST /api/exercises failed:", error);
    return NextResponse.json(
      { error: "Kunde inte skapa övning." },
      { status: 500 },
    );
  }
}
