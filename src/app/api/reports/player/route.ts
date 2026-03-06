import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeTo100, trendDirection } from "@/lib/scoring";
import { median } from "@/lib/stats";

function toDateOnly(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  const playerId = url.searchParams.get("playerId");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  const includeTeamAvg = url.searchParams.get("includeTeamAvg") === "true";

  if (!playerId || !start || !end) {
    return NextResponse.json(
      { error: "Missing required query params: playerId, start, end" },
      { status: 400 },
    );
  }

  const startDate = toDateOnly(new Date(start));
  const endDate = toDateOnly(new Date(end));

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: { Team: true },
  });

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const exercises = await prisma.exercise.findMany({
    where: { isActive: true, isCore: true },
    orderBy: { name: "asc" },
  });

  const measurements = await prisma.measurement.findMany({
    where: {
      playerId,
      exerciseId: { in: exercises.map((e) => e.id) },
      date: { gte: startDate, lte: endDate },
    },
    orderBy: [{ exerciseId: "asc" }, { date: "asc" }],
  });

  const byExercise = new Map<string, { date: Date; value: number }[]>();
  for (const m of measurements) {
    const arr = byExercise.get(m.exerciseId) ?? [];
    arr.push({ date: m.date, value: m.value });
    byExercise.set(m.exerciseId, arr);
  }

  function scoreFor(exerciseId: string, raw: number) {
    const ex = exercises.find((e) => e.id === exerciseId)!;
    return normalizeTo100({
      raw,
      best: ex.bestValue,
      worst: ex.worstValue,
      direction: ex.direction,
      step: ex.roundingStep ?? 0.5,
    });
  }

  let medianByExercise = new Map<string, number | null>();

  if (includeTeamAvg) {
    const teamPlayers = await prisma.player.findMany({
      where: { teamId: player.teamId, isActive: true },
      select: { id: true },
    });

    const teamMeasurements = await prisma.measurement.findMany({
      where: {
        playerId: { in: teamPlayers.map((p) => p.id) },
        exerciseId: { in: exercises.map((e) => e.id) },
        date: { gte: startDate, lte: endDate },
      },
      orderBy: [{ playerId: "asc" }, { exerciseId: "asc" }, { date: "asc" }],
    });

    const latestByPlayerExercise = new Map<string, number>();

    for (const m of teamMeasurements) {
      latestByPlayerExercise.set(`${m.playerId}::${m.exerciseId}`, m.value);
    }

    for (const ex of exercises) {
      const latestValues: number[] = [];

      for (const p of teamPlayers) {
        const raw = latestByPlayerExercise.get(`${p.id}::${ex.id}`);
        if (raw != null) latestValues.push(raw);
      }

      medianByExercise.set(ex.id, median(latestValues));
    }
  }

  const table = exercises.map((ex) => {
    const arr = byExercise.get(ex.id) ?? [];
    const latest = arr.length > 0 ? arr[arr.length - 1].value : null;
    const prev = arr.length > 1 ? arr[arr.length - 2].value : null;

    const latestScore = latest == null ? null : scoreFor(ex.id, latest);
    const prevScore = prev == null ? null : scoreFor(ex.id, prev);
    const deltaScore =
      latestScore != null && prevScore != null ? latestScore - prevScore : null;

    const medianRaw = includeTeamAvg
      ? (medianByExercise.get(ex.id) ?? null)
      : null;

    let gapToMedian: number | null = null;
    if (latest != null && medianRaw != null) {
      if (ex.direction === "HIGHER_BETTER") {
        gapToMedian = latest - medianRaw;
      } else {
        gapToMedian = medianRaw - latest;
      }
    }

    return {
      exerciseId: ex.id,
      exercise: ex.name,
      latestRaw: latest,
      latestScore,
      deltaScore,
      medianRaw,
      gapToMedian,
    };
  });

  const validScores = table
    .map((x) => x.latestScore)
    .filter((v): v is number => v != null);

  const totalStatus =
    validScores.length >= 3
      ? Number(
          (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(
            1,
          ),
        )
      : null;

  const prevScores = table
    .map((x) =>
      x.latestScore != null
        ? x.deltaScore != null
          ? x.latestScore - x.deltaScore
          : x.latestScore
        : null,
    )
    .filter((v): v is number => v != null);

  const totalPrev =
    prevScores.length >= 3
      ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length
      : null;

  const deltaTotal =
    totalStatus != null && totalPrev != null
      ? Number((totalStatus - totalPrev).toFixed(1))
      : 0;

  const ranked = table
    .filter((x) => x.latestScore != null && x.gapToMedian != null)
    .sort((a, b) => (b.gapToMedian ?? 0) - (a.gapToMedian ?? 0));

  const strengths = ranked.slice(0, 3);
  const focus = [...ranked].reverse().slice(0, 3);

  const radar = table.map((x) => ({
    exercise: x.exercise,
    playerScore: x.latestScore,
    teamScore: x.medianRaw,
  }));

  return NextResponse.json({
    meta: {
      generatedAt: new Date().toISOString(),
      start,
      end,
    },
    player: {
      id: player.id,
      name: player.name,
      birthYear: player.birthYear,
      primaryPosition: player.primaryPosition,
      team: player.Team.name,
      imageUrl: player.imageUrl,
    },
    totalStatus,
    insufficientData: validScores.length < 3,
    trend: {
      direction: trendDirection(deltaTotal),
      delta: deltaTotal,
    },
    strengths,
    focus,
    radar,
    table,
  });
}
