import { PrismaClient, ExerciseDirection } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  // @ts-ignore
  const team = await prisma.team.upsert({
    where: { name: "Vikingstad P16/17" },
    update: {},
    create: { 
      id: "324a1014-5a25-4a8d-96de-438ec1eb60ea",
      name: "Vikingstad P16/17",
      updatedAt: new Date(),
    },
  });

  const core = [
    { id: "9f8bd407-286f-4261-9700-8e5f5a3ed779", name: "Teknikbana", direction: ExerciseDirection.HIGHER_BETTER, bestValue: 100, worstValue: 0 },
    { id: "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6", name: "Passning Prick", direction: ExerciseDirection.HIGHER_BETTER, bestValue: 100, worstValue: 0 },
    { id: "b2c3d4e5-6f7g-8h9i-0j1k-l2m3n4o5p6q7", name: "Passning 2v2", direction: ExerciseDirection.HIGHER_BETTER, bestValue: 100, worstValue: 0 },
    { id: "c3d4e5f6-7g8h-9i0j-1k2l-m3n4o5p6q7r8", name: "Skott – Stillastående", direction: ExerciseDirection.HIGHER_BETTER, bestValue: 100, worstValue: 0 },
    { id: "d4e5f6g7-8h9i-0j1k-2l3m-n4o5p6q7r8s9", name: "Direktskott", direction: ExerciseDirection.HIGHER_BETTER, bestValue: 100, worstValue: 0 },
    { id: "e5f6g7h8-9i0j-1k2l-3m4n-o5p6q7r8s9t0", name: "Utmana", direction: ExerciseDirection.HIGHER_BETTER, bestValue: 100, worstValue: 0 },
  ];

  const exercises = [];
  for (const ex of core) {
    // @ts-ignore
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
        id: ex.id,
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

  const playersData = [
    { id: "287a7e18-e1bc-47e2-92ad-5361df66a24b", name: "Adam Karlsson", birthYear: 2009, primaryPosition: "CM" },
    { id: "f1a2b3c4-d5e6-7f8g-9h0i-j1k2l3m4n5o6", name: "Elias Svensson", birthYear: 2009, primaryPosition: "ST" },
    { id: "g2h3i4j5-k6l7-8m9n-0o1p-q2r3s4t5u6v7", name: "Noah Lind", birthYear: 2009, primaryPosition: "CB" },
    { id: "h3i4j5k6-l7m8-9n0o-1p2q-r3s4t5u6v7w8", name: "William Berg", birthYear: 2010, primaryPosition: "RW" },
  ];

  const players = [];
  for (const p of playersData) {
    // @ts-ignore
    const pl = await prisma.player.upsert({
      where: { teamId_name: { teamId: team.id, name: p.name } },
      update: {
        birthYear: p.birthYear,
        primaryPosition: p.primaryPosition,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        id: p.id,
        teamId: team.id,
        name: p.name,
        birthYear: p.birthYear,
        primaryPosition: p.primaryPosition,
        isActive: true,
        updatedAt: new Date(),
      },
    });
    players.push(pl);
  }

  const dates = [daysAgo(42), daysAgo(28), daysAgo(14), daysAgo(0)];

  for (const player of players) {
    for (const ex of exercises) {
      const base = 40 + Math.floor(Math.random() * 25);
      for (let i = 0; i < dates.length; i++) {
        const trend = (player.name.includes("Adam") || player.name.includes("William")) ? 1 : -1;
        const value = Math.max(0, Math.min(100, base + trend * i * 2 + Math.floor(Math.random() * 5) - 2));

        // @ts-ignore
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
            id: crypto.randomUUID(),
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
