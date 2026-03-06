"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Team = {
  id: string;
  name: string;
};

type Player = {
  id: string;
  name: string;
  primaryPosition?: string | null;
};

type Exercise = {
  id: string;
  name: string;
  unit?: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function BulkMeasurementsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const [teamId, setTeamId] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [date, setDate] = useState(todayISO());

  const [values, setValues] = useState<Record<string, string>>({});
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoadingBase(true);
        setError(null);

        const [teamsRes, exercisesRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/exercises"),
        ]);

        if (!teamsRes.ok || !exercisesRes.ok) {
          throw new Error("Kunde inte ladda grunddata.");
        }

        const teamsData = await teamsRes.json();
        const exercisesData = await exercisesRes.json();

        setTeams(teamsData);
        setExercises(exercisesData);

        if (teamsData?.[0]?.id) setTeamId(teamsData[0].id);
        if (exercisesData?.[0]?.id) setExerciseId(exercisesData[0].id);
      } catch (e: any) {
        setError(e?.message ?? "Kunde inte ladda sidan.");
      } finally {
        setLoadingBase(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!teamId) return;

    (async () => {
      try {
        setLoadingPlayers(true);
        setError(null);

        const res = await fetch(`/api/players?teamId=${teamId}`);
        if (!res.ok) throw new Error("Kunde inte ladda spelare.");

        const data = await res.json();
        setPlayers(data);

        // återställ värden när lag byts
        const nextValues: Record<string, string> = {};
        for (const player of data) {
          nextValues[player.id] = "";
        }
        setValues(nextValues);
      } catch (e: any) {
        setError(e?.message ?? "Kunde inte ladda spelare.");
      } finally {
        setLoadingPlayers(false);
      }
    })();
  }, [teamId]);

  const selectedExercise = useMemo(
    () => exercises.find((e) => e.id === exerciseId),
    [exercises, exerciseId],
  );

  const filledCount = useMemo(() => {
    return Object.values(values).filter((v) => v !== "").length;
  }, [values]);

  function updateValue(playerId: string, value: string) {
    setValues((prev) => ({
      ...prev,
      [playerId]: value,
    }));
  }

  async function handleSaveAll() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      if (!teamId || !exerciseId || !date) {
        throw new Error("Lag, övning och datum måste vara valda.");
      }

      const filledEntries = Object.entries(values).filter(
        ([, value]) => value !== "" && !Number.isNaN(Number(value)),
      );

      if (filledEntries.length === 0) {
        throw new Error("Fyll i minst ett värde innan du sparar.");
      }

      const results = await Promise.all(
        filledEntries.map(([playerId, value]) =>
          fetch("/api/measurements", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              playerId,
              exerciseId,
              date,
              value: Number(value),
              source: "bulk",
              createdBy: "coach",
            }),
          }),
        ),
      );

      const failed = results.filter((r) => !r.ok);

      if (failed.length > 0) {
        throw new Error(
          `${failed.length} mätning(ar) kunde inte sparas. Övriga kan ha sparats.`,
        );
      }

      setMessage(`${filledEntries.length} mätning(ar) sparades.`);

      const resetValues: Record<string, string> = {};
      for (const player of players) resetValues[player.id] = "";
      setValues(resetValues);
    } catch (e: any) {
      setError(e?.message ?? "Något gick fel vid sparning.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Bulk-inmatning av mätningar
          </h1>
          <p className="text-sm opacity-70 mt-1">
            Registrera samma övning för flera spelare samtidigt.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/measurements/new" className="underline">
            Enskild inmatning
          </Link>
          <Link href="/" className="underline">
            ← Tillbaka till dashboard
          </Link>
        </div>
      </div>

      {loadingBase && <p>Laddar grunddata…</p>}
      {error && <p className="text-red-600 mb-4">Fel: {error}</p>}
      {message && <p className="text-green-700 mb-4">{message}</p>}

      {!loadingBase && (
        <>
          <div className="border rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Lag</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Övning</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={exerciseId}
                onChange={(e) => setExerciseId(e.target.value)}
              >
                {exercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Datum</label>
              <input
                className="border rounded px-3 py-2 w-full"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4 text-sm opacity-80">
            {loadingPlayers ? (
              <span>Laddar spelare…</span>
            ) : (
              <span>
                Spelare: {players.length} • Ifyllda värden: {filledCount}
                {selectedExercise?.unit
                  ? ` • Enhet: ${selectedExercise.unit}`
                  : ""}
              </span>
            )}
          </div>

          <div className="border rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left border-b bg-gray-50">
                  <th className="p-3">Spelare</th>
                  <th className="p-3">Position</th>
                  <th className="p-3">
                    Värde{" "}
                    {selectedExercise?.unit ? `(${selectedExercise.unit})` : ""}
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b">
                    <td className="p-3 font-medium">{player.name}</td>
                    <td className="p-3 text-sm opacity-70">
                      {player.primaryPosition ?? "-"}
                    </td>
                    <td className="p-3">
                      <input
                        className="border rounded px-3 py-2 w-full max-w-[180px]"
                        type="number"
                        step="0.01"
                        value={values[player.id] ?? ""}
                        onChange={(e) => updateValue(player.id, e.target.value)}
                        placeholder="Ange värde"
                      />
                    </td>
                  </tr>
                ))}

                {players.length === 0 && !loadingPlayers && (
                  <tr>
                    <td colSpan={3} className="p-4 text-sm opacity-70">
                      Inga aktiva spelare hittades i laget.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSaveAll}
              disabled={saving || !exerciseId || !date || players.length === 0}
              className="border rounded px-4 py-2 font-medium"
            >
              {saving ? "Sparar..." : "Spara alla ifyllda värden"}
            </button>

            <button
              type="button"
              onClick={() => {
                const resetValues: Record<string, string> = {};
                for (const player of players) resetValues[player.id] = "";
                setValues(resetValues);
                setMessage(null);
                setError(null);
              }}
              className="border rounded px-4 py-2"
            >
              Rensa formulär
            </button>
          </div>
        </>
      )}
    </main>
  );
}
