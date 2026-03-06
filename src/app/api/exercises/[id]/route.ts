import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const allowedDirections = ["HIGHER_BETTER", "LOWER_BETTER"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const exercise = await prisma.exercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Övningen hittades inte." },
        { status: 404 },
      );
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("GET /api/exercises/[id] failed:", error);
    return NextResponse.json(
      { error: "Kunde inte hämta övningen." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const direction = body.direction;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
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
        NOT: {
          id,
        },
      },
    });

    if (existingExercise) {
      return NextResponse.json(
        { error: "Det finns redan en övning med detta namn." },
        { status: 409 },
      );
    }

    const updatedExercise = await prisma.exercise.update({
      where: { id },
      data: {
        name,
        direction,
        isActive,
        bestValue,
        worstValue,
      },
    });

    return NextResponse.json(updatedExercise);
  } catch (error) {
    console.error("PATCH /api/exercises/[id] failed:", error);
    return NextResponse.json(
      { error: "Kunde inte uppdatera övningen." },
      { status: 500 },
    );
  }
}
