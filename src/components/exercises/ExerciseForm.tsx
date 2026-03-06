"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ExerciseDirection = "HIGHER_BETTER" | "LOWER_BETTER";

type ExerciseFormValues = {
  id?: string;
  name: string;
  isActive: boolean;
  isCore: boolean;
  direction: ExerciseDirection;
  bestValue: number;
  worstValue: number;
};

type ExerciseFormProps = {
  mode: "create" | "edit";
  initialValues?: Partial<ExerciseFormValues>;
};

export default function ExerciseForm({
  mode,
  initialValues,
}: ExerciseFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);
  const [isCore, setIsCore] = useState(initialValues?.isCore ?? false);
  const [direction, setDirection] = useState<ExerciseDirection>(
    initialValues?.direction ?? "HIGHER_BETTER",
  );
  const [bestValue, setBestValue] = useState(
    initialValues?.bestValue?.toString() ?? "",
  );
  const [worstValue, setWorstValue] = useState(
    initialValues?.worstValue?.toString() ?? "",
  );

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const parsedBestValue = Number(bestValue);
    const parsedWorstValue = Number(worstValue);

    if (!trimmedName) {
      setError("Namn måste fyllas i.");
      return;
    }

    if (Number.isNaN(parsedBestValue) || Number.isNaN(parsedWorstValue)) {
      setError("Best value och worst value måste vara siffror.");
      return;
    }

    if (parsedBestValue === parsedWorstValue) {
      setError("Best value och worst value får inte vara samma.");
      return;
    }

    if (direction === "HIGHER_BETTER" && parsedBestValue <= parsedWorstValue) {
      setError(
        "När högre värde är bättre måste best value vara större än worst value.",
      );
      return;
    }

    if (direction === "LOWER_BETTER" && parsedBestValue >= parsedWorstValue) {
      setError(
        "När lägre värde är bättre måste best value vara mindre än worst value.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: trimmedName,
        isActive,
        isCore,
        direction,
        bestValue: parsedBestValue,
        worstValue: parsedWorstValue,
      };

      const url =
        mode === "create"
          ? "/api/exercises"
          : `/api/exercises/${initialValues?.id}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Något gick fel.");
        return;
      }

      setSaved(true);
      setTimeout(() => {
        router.push("/exercises");
      }, 800);
    } catch {
      setError("Kunde inte spara övningen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Namn
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded border px-3 py-2"
          placeholder="Ange övningsnamn"
        />
      </div>

      <div>
        <label htmlFor="direction" className="block text-sm font-medium mb-1">
          Riktning
        </label>
        <select
          id="direction"
          value={direction}
          onChange={(e) => setDirection(e.target.value as ExerciseDirection)}
          className="w-full rounded border px-3 py-2"
        >
          <option value="HIGHER_BETTER">Högre värde är bättre</option>
          <option value="LOWER_BETTER">Lägre värde är bättre</option>
        </select>
      </div>

      <div>
        <label htmlFor="bestValue" className="block text-sm font-medium mb-1">
          Best value
        </label>
        <input
          id="bestValue"
          type="number"
          step="any"
          value={bestValue}
          onChange={(e) => setBestValue(e.target.value)}
          className="w-full rounded border px-3 py-2"
          placeholder="Ange best value"
        />
      </div>

      <div>
        <label htmlFor="worstValue" className="block text-sm font-medium mb-1">
          Worst value
        </label>
        <input
          id="worstValue"
          type="number"
          step="any"
          value={worstValue}
          onChange={(e) => setWorstValue(e.target.value)}
          className="w-full rounded border px-3 py-2"
          placeholder="Ange worst value"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isActive"
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        <label htmlFor="isActive" className="text-sm font-medium">
          Aktiv
        </label>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isCore"
          type="checkbox"
          checked={isCore}
          onChange={(e) => setIsCore(e.target.checked)}
        />
        <label htmlFor="isCore" className="text-sm font-medium">
          Kärnövning (visas i dashboard)
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved ? (
        <p className="text-sm text-green-700 font-medium">
          ✓ {mode === "create" ? "Övningen skapades!" : "Ändringarna sparades!"} Skickar dig tillbaka…
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || saved}
          className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isSubmitting
            ? "Sparar..."
            : mode === "create"
              ? "Skapa övning"
              : "Spara ändringar"}
        </button>

        <button
          type="button"
          disabled={saved}
          onClick={() => router.push("/exercises")}
          className="rounded border px-4 py-2 disabled:opacity-50"
        >
          Avbryt
        </button>
      </div>
    </form>
  );
}
