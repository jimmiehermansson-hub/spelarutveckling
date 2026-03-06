import { PrismaClient, ExerciseDirection } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // Measurement.date är @db.Date, tid spelar ingen roll
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  // Team
  const team = await prisma.team.upsert({
    where: { name: "Vikingstad P16/17" },
    update: {},
    create: { name: "Vikingstad P16/17" },
  });

  // Core exercises (best/worst är placeholders – kan justeras senare)
  const core = [
    {
      name: "Teknikbana",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
    {
      name: "Passning Prick",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
    {
      name: "Passning 2v2",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
    {
      name: "Skott – Stillastående",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
    {
      name: "Direktskott",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
    {
      name: "Utmana",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
  ];

  const exercises = [];
  for (const ex of core) {
    const created = await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {
        direction: ex.direction,
        bestValue: ex.bestValue,
        worstValue: ex.worstValue,
        isCore: true,
        isActive: true,
        roundingStep: 0.5,
      },
      create: {
        name: ex.name,
        direction: ex.direction,
        bestValue: ex.bestValue,
        worstValue: ex.worstValue,
        roundingStep: 0.5,
        isCore: true,
        isActive: true,
      },
    });
    exercises.push(created);
  }

  // Players
  const playersData = [
    { name: "Adam Karlsson", birthYear: 2009, primaryPosition: "CM" },
    { name: "Elias Svensson", birthYear: 2009, primaryPosition: "ST" },
    { name: "Noah Lind", birthYear: 2009, primaryPosition: "CB" },
    { name: "William Berg", birthYear: 2010, primaryPosition: "RW" },
  ];

  const players = [];
  for (const p of playersData) {
    const pl = await prisma.player.upsert({
      where: { teamId_name: { teamId: team.id, name: p.name } },
      update: {
        birthYear: p.birthYear,
        primaryPosition: p.primaryPosition,
        isActive: true,
      },
      create: {
        teamId: team.id,
        name: p.name,
        birthYear: p.birthYear,
        primaryPosition: p.primaryPosition,
        isActive: true,
      },
    });
    players.push(pl);
  }

  // Measurements (skapa lite historik: 4 datapunkter per övning för varje spelare)
  // Vi gör lite variation så dashboarden visar styrkor/fokus/trend.
  const dates = [daysAgo(42), daysAgo(28), daysAgo(14), daysAgo(0)];

  for (const player of players) {
    for (const ex of exercises) {
      const base = 40 + Math.floor(Math.random() * 25); // 40–64
      for (let i = 0; i < dates.length; i++) {
        // skapa en svag trend upp för vissa, ner för andra
        const trend =
          player.name.includes("Adam") || player.name.includes("William")
            ? +1
            : -1;
        const value = Math.max(
          0,
          Math.min(
            100,
            base + trend * i * 2 + Math.floor(Math.random() * 5) - 2,
          ),
        );

        await prisma.measurement.upsert({
          where: {
            playerId_exerciseId_date: {
              playerId: player.id,
              exerciseId: ex.id,
              date: dates[i],
            },
          },
          update: { value, source: "seed" },
          create: {
            playerId: player.id,
            exerciseId: ex.id,
            date: dates[i],
            value,
            source: "seed",
          },
        });
      }
    }
  }

  console.log("✅ Seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
