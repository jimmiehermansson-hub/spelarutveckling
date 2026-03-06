import { PrismaClient, ExerciseDirection } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const team = await prisma.team.upsert({
    where: { name: "Vikingstad P16/17" },
    update: {
      updatedAt: new Date(),
    },
    create: {
      id: "324a1014-5a25-4a8d-96de-438ec1eb60ea",
      name: "Vikingstad P16/17",
      updatedAt: new Date(),
    },
  });

  const coreExercises = [
    {
      id: "9f8bd407-286f-4261-9700-8e5f5a3ed779",
      name: "Teknikbana",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
    {
      id: "a1b2c3d4-5e6f-7g8h-9i0j-k1l2m3n4o5p6",
      name: "Passning Prick",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
    {
      id: "b2c3d4e5-6f7g-8h9i-0j1k-l2m3n4o5p6q7",
      name: "Passning 2v2",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
    {
      id: "c3d4e5f6-7g8h-9i0j-1k2l-m3n4o5p6q7r8",
      name: "Skott – Stillastående",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
    {
      id: "d4e5f6g7-8h9i-0j1k-2l3m-n4o5p6q7r8s9",
      name: "Direktskott",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
    {
      id: "e5f6g7h8-9i0j-1k2l-3m4n-o5p6q7r8s9t0",
      name: "Utmana",
      direction: ExerciseDirection.HIGHER_BETTER,
      bestValue: 100,
      worstValue: 0,
    },
  ];

  for (const ex of coreExercises) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {
        direction: ex.direction,
        bestValue: ex.bestValue,
        worstValue: ex.worstValue,
        roundingStep: 0.5,
        isCore: true,
        isActive: true,
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
  }

  console.log(
    `✅ Seed klar: lag "${team.name}" och grundövningar finns på plats.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
