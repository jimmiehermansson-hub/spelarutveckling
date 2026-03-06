import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const team = await prisma.team.findUnique({
    where: { name: "Vikingstad P16/17" },
  });

  if (!team) {
    throw new Error('Team "Vikingstad P16/17" hittades inte.');
  }

  const existingPlayers = await prisma.player.findMany({
    where: { teamId: team.id },
    select: { id: true },
  });

  const existingPlayerIds = existingPlayers.map((p) => p.id);

  if (existingPlayerIds.length > 0) {
    await prisma.measurement.deleteMany({
      where: {
        playerId: { in: existingPlayerIds },
      },
    });

    await prisma.player.deleteMany({
      where: {
        teamId: team.id,
      },
    });
  }

  const playersData = [
    { name: "Adrian Frumerie", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Alvar Holmér", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Anton Rosén", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Arvid Svärd", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Bosse Wirsén", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Charlie Algborn-Kron", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Edvin Logander", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Elvin Gunnarsson", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Emil Ljunggren", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Emil Löfvenborg", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Henry Durefelt", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Hjalmar Norlén", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Isak Arvén", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Jonah Hermansson", birthYear: 2016, primaryPosition: "UTE" },
    { name: "León Wickström", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Lion Green", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Ludvig Fredriksson", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Ludwig Algborn-Kron", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Milton Malmgren", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Noel Svenrud", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Oliver Brammer", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Olle Wass", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Oscar Angvik", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Pontus Öresjö", birthYear: 2016, primaryPosition: "UTE" },
    { name: "Ryan Al Darzi", birthYear: 2017, primaryPosition: "UTE" },
    { name: "Tage Wiklund", birthYear: 2017, primaryPosition: "UTE" },
  ];

  for (const p of playersData) {
    await prisma.player.create({
      data: {
        id: randomUUID(),
        teamId: team.id,
        name: p.name,
        birthYear: p.birthYear,
        primaryPosition: p.primaryPosition,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  console.log("✅ Spelare importerade");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
