import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const targetDate = new Date("2026-01-20");
  targetDate.setHours(0, 0, 0, 0);

  const team = await prisma.team.findUnique({
    where: { name: "Vikingstad P16/17" },
  });

  if (!team) {
    throw new Error('Team "Vikingstad P16/17" hittades inte.');
  }

  const teknikbana = await prisma.exercise.findFirst({
    where: {
      name: {
        equals: "Teknikbana",
        mode: "insensitive",
      },
    },
  });

  if (!teknikbana) {
    throw new Error('Övningen "Teknikbana" hittades inte.');
  }

  const teamPlayers = await prisma.player.findMany({
    where: { teamId: team.id },
    select: { id: true, name: true },
  });

  const playerIds = teamPlayers.map((p) => p.id);

  if (playerIds.length === 0) {
    throw new Error("Inga spelare hittades i laget.");
  }

  // Hämta alla measurements för lagets spelare.
  const measurements = await prisma.measurement.findMany({
    where: {
      playerId: { in: playerIds },
    },
    orderBy: [{ playerId: "asc" }, { createdAt: "asc" }],
  });

  // Filtrera bort sådant som redan är rätt:
  // rätt övning + rätt datum behöver inte ändras.
  const wrongMeasurements = measurements.filter((m) => {
    const dateOnly = new Date(m.date);
    dateOnly.setHours(0, 0, 0, 0);

    const correctExercise = m.exerciseId === teknikbana.id;
    const correctDate = dateOnly.getTime() === targetDate.getTime();

    return !(correctExercise && correctDate);
  });

  let updatedCount = 0;
  let mergedCount = 0;

  for (const m of wrongMeasurements) {
    // Finns det redan en korrekt rad för samma spelare?
    const existingCorrect = await prisma.measurement.findUnique({
      where: {
        playerId_exerciseId_date: {
          playerId: m.playerId,
          exerciseId: teknikbana.id,
          date: targetDate,
        },
      },
    });

    if (existingCorrect) {
      // Uppdatera den korrekta raden med värdet från felraden
      await prisma.measurement.update({
        where: { id: existingCorrect.id },
        data: {
          value: m.value,
          source: m.source ?? "manual",
          createdBy: m.createdBy ?? "coach",
        },
      });

      // Ta bort felraden för att undvika dubletter
      await prisma.measurement.delete({
        where: { id: m.id },
      });

      mergedCount++;
    } else {
      // Ingen konflikt, uppdatera samma rad direkt
      await prisma.measurement.update({
        where: { id: m.id },
        data: {
          exerciseId: teknikbana.id,
          date: targetDate,
        },
      });

      updatedCount++;
    }
  }

  console.log(
    `✅ Klart. Uppdaterade ${updatedCount} mätningar och slog ihop ${mergedCount} konfliktande poster till Teknikbana på 2026-01-20.`,
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
