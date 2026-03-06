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
  const teamId = url.searchParams.get("teamId");
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!teamId || !start || !end) {
    return NextResponse.json(
      { error: "Missing required query params: teamId, start, end" },
      { status: 400 },
    );
  }

  const startDate = toDateOnly(new Date(start));
  const endDate = toDateOnly(new Date(end));

  const exercises = await prisma.exercise.findMany({
    where: { isActive: true, isCore: true },
    orderBy: { name: "asc" },
  });

  const players = await prisma.player.findMany({
    where: { teamId, isActive: true },
    orderBy: { name: "asc" },
  });

  const playerIds = players.map((p) => p.id);
  const exerciseIds = exercises.map((e) => e.id);

  const measurements = await prisma.measurement.findMany({
    where: {
      playerId: { in: playerIds },
      exerciseId: { in: exerciseIds },
      date: { gte: startDate, lte: endDate },
    },
    orderBy: [{ playerId: "asc" }, { exerciseId: "asc" }, { date: "asc" }],
  });

  const byPlayerExercise = new Map<string, { date: Date; value: number }[]>();

  for (const m of measurements) {
    const key = `${m.playerId}::${m.exerciseId}`;
    const arr = byPlayerExercise.get(key) ?? [];
    arr.push({ date: m.date, value: m.value });
    byPlayerExercise.set(key, arr);
  }

  function latestAndPrev(playerId: string, exerciseId: string) {
    const key = `${playerId}::${exerciseId}`;
    const arr = byPlayerExercise.get(key) ?? [];
    if (arr.length === 0) {
      return { latest: null as number | null, prev: null as number | null };
    }
    const latest = arr[arr.length - 1].value;
    const prev = arr.length > 1 ? arr[arr.length - 2].value : null;
    return { latest, prev };
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

  // Median per övning, baserat på senaste värde per spelare i perioden
  const medianByExercise = new Map<string, number | null>();

  for (const ex of exercises) {
    const latestValues: number[] = [];

    for (const p of players) {
      const { latest } = latestAndPrev(p.id, ex.id);
      if (latest != null) latestValues.push(latest);
    }

    medianByExercise.set(ex.id, median(latestValues));
  }

  const lastTestByPlayer = new Map<string, Date | null>();
  for (const p of players) lastTestByPlayer.set(p.id, null);

  for (const m of measurements) {
    const current = lastTestByPlayer.get(m.playerId);
    if (!current || m.date > current) {
      lastTestByPlayer.set(m.playerId, m.date);
    }
  }

  const result = players.map((p) => {
    const perExercise = exercises
      .map((ex) => {
        const { latest, prev } = latestAndPrev(p.id, ex.id);
        if (latest == null) return null;

        const latestScore = scoreFor(ex.id, latest);
        const prevScore = prev == null ? null : scoreFor(ex.id, prev);
        const deltaScore = prevScore == null ? null : latestScore - prevScore;

        const exMedian = medianByExercise.get(ex.id);
        let gapToMedian: number | null = null;

        if (exMedian != null) {
          if (ex.direction === "HIGHER_BETTER") {
            gapToMedian = latest - exMedian;
          } else {
            gapToMedian = exMedian - latest;
          }
        }

        return {
          exerciseId: ex.id,
          exercise: ex.name,
          raw: latest,
          score: latestScore,
          deltaScore,
          medianRaw: exMedian,
          gapToMedian,
        };
      })
      .filter(Boolean) as Array<{
      exerciseId: string;
      exercise: string;
      raw: number;
      score: number;
      deltaScore: number | null;
      medianRaw: number | null;
      gapToMedian: number | null;
    }>;

    const scores = perExercise.map((x) => x.score);
    const sufficient = scores.length >= 3;
    const totalStatus = sufficient
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;

    const prevScores = perExercise.map((x) =>
      x.deltaScore == null ? x.score : x.score - x.deltaScore,
    );

    const totalPrev = sufficient
      ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length
      : null;

    const deltaTotal =
      totalStatus != null && totalPrev != null ? totalStatus - totalPrev : 0;

    const withMedian = perExercise.filter((x) => x.gapToMedian != null);

    const strengths = [...withMedian]
      .sort((a, b) => (b.gapToMedian ?? 0) - (a.gapToMedian ?? 0))
      .slice(0, 2)
      .map((x) => ({
        exercise: x.exercise,
        score: x.score,
        raw: x.raw,
        medianRaw: x.medianRaw,
        gapToMedian: x.gapToMedian,
      }));

    const focus = [...withMedian]
      .sort((a, b) => (a.gapToMedian ?? 0) - (b.gapToMedian ?? 0))
      .slice(0, 2)
      .map((x) => ({
        exercise: x.exercise,
        score: x.score,
        raw: x.raw,
        medianRaw: x.medianRaw,
        gapToMedian: x.gapToMedian,
      }));

    const lastTestDate = lastTestByPlayer.get(p.id);

    return {
      player: {
        id: p.id,
        name: p.name,
        primaryPosition: p.primaryPosition,
        imageUrl: p.imageUrl,
      },
      lastTestDate: lastTestDate
        ? lastTestDate.toISOString().slice(0, 10)
        : null,
      totalStatus: totalStatus != null ? Number(totalStatus.toFixed(1)) : null,
      insufficientData: !sufficient,
      trend: {
        direction: trendDirection(deltaTotal),
        delta: Number(deltaTotal.toFixed(1)),
      },
      strengths,
      focus,
    };
  });

  return NextResponse.json(result);
}
