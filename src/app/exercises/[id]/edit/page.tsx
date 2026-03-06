import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ExerciseForm from "@/components/exercises/ExerciseForm";

type EditExercisePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditExercisePage({
  params,
}: EditExercisePageProps) {
  const { id } = await params;

  const exercise = await prisma.exercise.findUnique({
    where: { id },
  });

  if (!exercise) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/exercises" className="text-sm underline">
          ← Tillbaka till övningar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Redigera övning</h1>
        <p className="text-sm text-gray-600">
          Uppdatera inställningar för övningen.
        </p>
      </div>

      <ExerciseForm
        mode="edit"
        initialValues={{
          id: exercise.id,
          name: exercise.name,
          isActive: exercise.isActive,
          isCore: exercise.isCore,
          direction: exercise.direction,
          bestValue: exercise.bestValue,
          worstValue: exercise.worstValue,
        }}
      />
    </div>
  );
}
