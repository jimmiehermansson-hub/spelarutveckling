import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";

const prisma = new PrismaClient();

type CsvPlayerRow = {
  name: string;
  birthYear?: string;
  primaryPosition?: string;
  isActive?: string;
};

async function main() {
  const team = await prisma.team.findUnique({
    where: { name: "Vikingstad P16/17" },
  });

  if (!team) {
    throw new Error('Team "Vikingstad P16/17" hittades inte.');
  }

  const csvPath = path.join(process.cwd(), "data", "players.csv");
  const fileContent = await fs.readFile(csvPath, "utf8");

  const rows = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvPlayerRow[];

  if (rows.length === 0) {
    throw new Error("CSV-filen är tom.");
  }

  const playersData = rows.map((row, index) => {
    const name = row.name?.trim();

    if (!name) {
      throw new Error(`Rad ${index + 2}: name saknas.`);
    }

    const birthYear =
      row.birthYear && row.birthYear.trim() !== ""
        ? Number(row.birthYear)
        : null;

    if (birthYear !== null && Number.isNaN(birthYear)) {
      throw new Error(`Rad ${index + 2}: birthYear är ogiltigt.`);
    }

    const primaryPosition =
      row.primaryPosition && row.primaryPosition.trim() !== ""
        ? row.primaryPosition.trim()
        : null;

    const isActive =
      row.isActive && row.isActive.trim() !== ""
        ? row.isActive.trim().toLowerCase() === "true"
        : true;

    return {
      name,
      birthYear,
      primaryPosition,
      isActive,
    };
  });

  const duplicateNamesInCsv = playersData
    .map((p) => p.name.toLowerCase())
    .filter((name, index, arr) => arr.indexOf(name) !== index);

  if (duplicateNamesInCsv.length > 0) {
    throw new Error(
      `Dubbletter i CSV: ${[...new Set(duplicateNamesInCsv)].join(", ")}`,
    );
  }

  let createdCount = 0;
  let updatedCount = 0;

  for (const p of playersData) {
    const existingPlayer = await prisma.player.findFirst({
      where: {
        teamId: team.id,
        name: {
          equals: p.name,
          mode: "insensitive",
        },
      },
    });

    if (existingPlayer) {
      await prisma.player.update({
        where: { id: existingPlayer.id },
        data: {
          birthYear: p.birthYear,
          primaryPosition: p.primaryPosition,
          isActive: p.isActive,
          updatedAt: new Date(),
        },
      });

      updatedCount++;
    } else {
      await prisma.player.create({
        data: {
          id: randomUUID(),
          teamId: team.id,
          name: p.name,
          birthYear: p.birthYear,
          primaryPosition: p.primaryPosition,
          isActive: p.isActive,
          updatedAt: new Date(),
        },
      });

      createdCount++;
    }
  }

  console.log(
    `✅ Import klar. Skapade ${createdCount} nya spelare och uppdaterade ${updatedCount} befintliga.`,
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
