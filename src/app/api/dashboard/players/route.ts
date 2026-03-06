import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeTo100, trendDirection } from "@/lib/scoring";

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

  // 1) Hämta core-övningar
  const exercises = await prisma.exercise.findMany({
    where: { isActive: true, isCore: true },
    orderBy: { name: "asc" },
  });

  // 2) Hämta spelare
  const players = await prisma.player.findMany({
    where: { teamId, isActive: true },
    orderBy: { name: "asc" },
  });

  // 3) Hämta alla measurements inom perioden för dessa spelare + core exercises
  const playerIds = players.map((p) => p.id);
  const exerciseIds = exercises.map((e) => e.id);

  const measurements = await prisma.measurement.findMany({
    where: {
      playerId: { in: playerIds },
      exerciseId: { in: exerciseIds },
      date: { gte: startDate, lte: endDate },
    },
    orderBy: [{ date: "asc" }],
  });

  // Grupp per player+exercise
  const byPE = new Map<string, { date: Date; value: number }[]>();
  for (const m of measurements) {
    const key = `${m.playerId}::${m.exerciseId}`;
    const arr = byPE.get(key) ?? [];
    arr.push({ date: m.date, value: m.value });
    byPE.set(key, arr);
  }

  // Hjälpfunktion: senaste + föregående i perioden
  function latestAndPrev(playerId: string, exerciseId: string) {
    const key = `${playerId}::${exerciseId}`;
    const arr = byPE.get(key) ?? [];
    if (arr.length === 0)
      return { latest: null as null | number, prev: null as null | number };
    const latest = arr[arr.length - 1].value;
    const prev = arr.length >= 2 ? arr[arr.length - 2].value : null;
    return { latest, prev };
  }

  // Hjälpfunktion: score för raw
  function scoreFor(exId: string, raw: number) {
    const ex = exercises.find((e) => e.id === exId)!;
    return normalizeTo100({
      raw,
      best: ex.bestValue,
      worst: ex.worstValue,
      direction: ex.direction,
      step: ex.roundingStep ?? 0.5,
    });
  }

  // Senaste testdatum per spelare (max date i perioden)
  const lastTestByPlayer = new Map<string, Date | null>();
  for (const p of players) lastTestByPlayer.set(p.id, null);
  for (const m of measurements) {
    const cur = lastTestByPlayer.get(m.playerId);
    if (!cur || m.date > cur) lastTestByPlayer.set(m.playerId, m.date);
  }

  // 4) Bygg respons per spelare
  const result = players.map((p) => {
    const perExercise = exercises
      .map((ex) => {
        const { latest, prev } = latestAndPrev(p.id, ex.id);
        if (latest == null) return null;

        const latestScore = scoreFor(ex.id, latest);
        const prevScore = prev == null ? null : scoreFor(ex.id, prev);
        const deltaScore = prevScore == null ? null : latestScore - prevScore;

        return {
          exerciseId: ex.id,
          exercise: ex.name,
          raw: latest,
          score: latestScore,
          deltaScore,
        };
      })
      .filter(Boolean) as Array<{
      exerciseId: string;
      exercise: string;
      raw: number;
      score: number;
      deltaScore: number | null;
    }>;

    // total status enligt default: min 3 av 6 core
    const scores = perExercise.map((x) => x.score);
    const sufficient = scores.length >= 3;
    const totalStatus = sufficient
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;

    // previous total: använd prevScore om finns annars latestScore
    const prevScores = perExercise.map((x) =>
      x.deltaScore == null ? x.score : x.score - x.deltaScore,
    );
    const totalPrev = sufficient
      ? prevScores.reduce((a, b) => a + b, 0) / prevScores.length
      : null;

    const deltaTotal =
      totalStatus != null && totalPrev != null ? totalStatus - totalPrev : 0;

    // strengths & focus
    const sorted = [...perExercise].sort((a, b) => b.score - a.score);
    const strengths = sorted.slice(0, 3).map((x) => ({
      exercise: x.exercise,
      score: x.score,
      raw: x.raw,
    }));
    const focus = sorted
      .slice(-3)
      .reverse()
      .map((x) => ({
        exercise: x.exercise,
        score: x.score,
        raw: x.raw,
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
      strengths: strengths.slice(0, 2),
      focus: focus.slice(0, 2),
    };
  });

  return NextResponse.json(result);
}
