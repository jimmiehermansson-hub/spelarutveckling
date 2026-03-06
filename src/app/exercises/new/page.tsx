import Link from "next/link";
import ExerciseForm from "@/components/exercises/ExerciseForm";

export default function NewExercisePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/exercises" className="text-sm underline">
          ← Tillbaka till övningar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Ny övning</h1>
        <p className="text-sm text-gray-600">
          Skapa en ny övning för spelarutveckling.
        </p>
      </div>

      <ExerciseForm mode="create" />
    </div>
  );
}
