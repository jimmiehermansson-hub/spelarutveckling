import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";

const prisma = new PrismaClient();

export default async function PlayerPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id },
    include: {
      team: true,
      measurements: {
        orderBy: { date: "desc" },
        include: {
          exercise: true,
        },
      },
    },
  });

  if (!player) {
    notFound();
  }

  // Gruppera mätningar efter datum för att simulera "tester"
  const groupedMeasurements = player.measurements.reduce((acc, curr) => {
    const dateStr = curr.date.toISOString().split('T')[0];
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(curr);
    return acc;
  }, {} as Record<string, typeof player.measurements>);

  const sortedDates = Object.keys(groupedMeasurements).sort((a, b) => b.localeCompare(a));

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
        ← Tillbaka till Dashboard
      </Link>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h1 className="text-3xl font-bold">{player.name}</h1>
        <p className="text-gray-600">{player.primaryPosition || "Ingen position angiven"}</p>
        <p className="text-gray-600">Lag: {player.team.name}</p>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Mäthistorik</h2>
      <div className="space-y-4">
        {sortedDates.length === 0 ? (
          <p className="text-gray-500 italic">Inga mätningar registrerade.</p>
        ) : (
          sortedDates.map((date) => (
            <div key={date} className="border rounded-lg p-4 bg-gray-50">
              <div className="font-medium text-lg mb-2">
                {new Date(date).toLocaleDateString("sv-SE")}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {groupedMeasurements[date].map((m) => (
                  <div key={m.id} className="flex justify-between border-b pb-1">
                    <span>{m.exercise.name}</span>
                    <span className="font-semibold">{m.value} {m.exercise.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
