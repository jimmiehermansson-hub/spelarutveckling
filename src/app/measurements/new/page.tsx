"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

export default function NewMeasurementPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [value, setValue] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [teamsRes, exercisesRes] = await Promise.all([
          fetch("/api/teams"),
          fetch("/api/exercises"),
        ]);

        const teamsData = await teamsRes.json();
        const exercisesData = await exercisesRes.json();

        setTeams(teamsData);
        setExercises(exercisesData);

        if (teamsData?.[0]?.id) {
          setTeamId(teamsData[0].id);
        }
      } catch (e) {
        console.error(e);
        setError("Kunde inte ladda grunddata.");
      }
    })();
  }, []);

  useEffect(() => {
    if (!teamId) return;

    (async () => {
      setLoadingPlayers(true);
      try {
        const res = await fetch(`/api/players?teamId=${teamId}`);
        const data = await res.json();
        setPlayers(data);
        setPlayerId(data?.[0]?.id ?? "");
      } catch (e) {
        console.error(e);
        setError("Kunde inte ladda spelare.");
      } finally {
        setLoadingPlayers(false);
      }
    })();
  }, [teamId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/measurements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId,
          exerciseId,
          date,
          value: Number(value),
          source: "manual",
          createdBy: "coach",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Kunde inte spara mätning.");
      }

      setMessage("Mätningen sparades.");
      setValue("");
    } catch (e: any) {
      setError(e?.message ?? "Något gick fel.");
    } finally {
      setLoading(false);
    }
  }

  const selectedExercise = exercises.find((e) => e.id === exerciseId);

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Registrera ny mätning</h1>
          <p className="text-sm opacity-70 mt-1">
            Lägg in ett nytt testvärde för en spelare.
          </p>
        </div>

        <Link href="/" className="underline">
          ← Tillbaka till dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="border rounded-xl p-6 space-y-4">
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
          <label className="block text-sm mb-1">Spelare</label>
          <select
            className="border rounded px-3 py-2 w-full"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            disabled={loadingPlayers}
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
                {player.primaryPosition ? ` (${player.primaryPosition})` : ""}
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
            <option value="">Välj övning</option>
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

        <div>
          <label className="block text-sm mb-1">
            Värde {selectedExercise?.unit ? `(${selectedExercise.unit})` : ""}
          </label>
          <input
            className="border rounded px-3 py-2 w-full"
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ange värde"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={
              loading || !teamId || !playerId || !exerciseId || !date || !value
            }
            className="border rounded px-4 py-2 font-medium"
          >
            {loading ? "Sparar..." : "Spara mätning"}
          </button>
        </div>

        {message && <p className="text-green-700">{message}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </form>
    </main>
  );
}
