import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function ExercisesPage() {
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm underline">
            ← Tillbaka till dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Övningar</h1>
          <p className="text-sm text-gray-600">
            Hantera övningar för spelarutveckling.
          </p>
        </div>

        <Link
          href="/exercises/new"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Ny övning
        </Link>
      </div>

      {exercises.length === 0 ? (
        <div className="rounded border p-6">
          <p>Det finns inga övningar ännu.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 text-black">
              <tr className="text-left">
                <th className="px-4 py-3 text-sm font-medium">Namn</th>
                <th className="px-4 py-3 text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-sm font-medium">Kärnövning</th>
                <th className="px-4 py-3 text-sm font-medium">Riktning</th>
                <th className="px-4 py-3 text-sm font-medium">Best value</th>
                <th className="px-4 py-3 text-sm font-medium">Worst value</th>
                <th className="px-4 py-3 text-sm font-medium">Åtgärd</th>
              </tr>
            </thead>
            <tbody>
              {exercises.map((exercise) => (
                <tr key={exercise.id} className="border-t">
                  <td className="px-4 py-3 text-sm">{exercise.name}</td>
                  <td className="px-4 py-3 text-sm">
                    {exercise.isActive ? "Aktiv" : "Inaktiv"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {exercise.isCore ? "Ja" : "Nej"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {exercise.direction === "HIGHER_BETTER"
                      ? "Högre är bättre"
                      : "Lägre är bättre"}
                  </td>
                  <td className="px-4 py-3 text-sm">{exercise.bestValue}</td>
                  <td className="px-4 py-3 text-sm">{exercise.worstValue}</td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/exercises/${exercise.id}/edit`}
                      className="rounded border px-3 py-1"
                    >
                      Redigera
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
