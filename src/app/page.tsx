"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type DashboardRow = {
  player: { id: string; name: string; primaryPosition?: string | null };
  lastTestDate: string | null;
  totalStatus: number | null;
  insufficientData: boolean;
  trend: { direction: "UP" | "DOWN" | "NEUTRAL"; delta: number };
  strengths: { exercise: string; score: number; raw: number }[];
  focus: { exercise: string; score: number; raw: number }[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function HomePage() {
  // För MVP: vi hämtar första teamet automatiskt
  const [teamId, setTeamId] = useState<string | null>(null);
  const [start, setStart] = useState(daysAgoISO(60));
  const [end, setEnd] = useState(todayISO());
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hämta teamId
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/teams");
      const teams = await res.json();
      if (teams?.[0]?.id) setTeamId(teams[0].id);
    })();
  }, []);

  const summary = useMemo(() => {
    const total = rows.length;
    const withData = rows.filter((r) => !r.insufficientData).length;
    const lastDates = rows
      .map((r) => r.lastTestDate)
      .filter(Boolean) as string[];
    const last = lastDates.sort().slice(-1)[0] ?? null;
    return { total, withData, last };
  }, [rows]);

  useEffect(() => {
    if (!teamId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/dashboard/players?teamId=${teamId}&start=${start}&end=${end}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as DashboardRow[];
        setRows(data);
      } catch (e: any) {
        setError(e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [teamId, start, end]);

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-semibold">Spelarutveckling – Dashboard</h1>
      <div className="mt-3 flex gap-3">
        <Link
          href="/measurements/new"
          className="border rounded px-3 py-2 inline-block"
        >
          Registrera ny mätning
        </Link>
        <Link
          href="/measurements/bulk"
          className="border rounded px-3 py-2 inline-block"
        >
          Bulk-inmatning
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm opacity-80">Period start</label>
          <input
            className="border rounded px-2 py-1"
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm opacity-80">Period slut</label>
          <input
            className="border rounded px-2 py-1"
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        <button
          className="border rounded px-3 py-1"
          onClick={() => {
            setStart(daysAgoISO(28));
            setEnd(todayISO());
          }}
        >
          Senaste 4 veckor
        </button>
        <button
          className="border rounded px-3 py-1"
          onClick={() => {
            setStart(daysAgoISO(90));
            setEnd(todayISO());
          }}
        >
          Senaste 3 månader
        </button>
      </div>

      <div className="mt-4 text-sm">
        <span>Antal spelare: {summary.total}</span>
        <span className="ml-4">Tillräcklig data: {summary.withData}</span>
        <span className="ml-4">Senaste test: {summary.last ?? "-"}</span>
      </div>

      {loading && <p className="mt-4">Laddar…</p>}
      {error && <p className="mt-4 text-red-600">Fel: {error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[900px] border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Spelare</th>
              <th>Total</th>
              <th>Trend</th>
              <th>Styrkor</th>
              <th>Fokus</th>
              <th>Senast testad</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.player.id} className="border-b">
                <td className="py-2">
                  <div className="font-medium">
                    <Link
                      className="underline"
                      href={`/players/${r.player.id}`}
                    >
                      {r.player.name}
                    </Link>
                  </div>
                  <div className="text-xs opacity-70">
                    {r.player.primaryPosition ?? "-"}
                  </div>
                </td>
                <td className="font-semibold">
                  {r.totalStatus == null ? "–" : r.totalStatus}
                </td>
                <td>
                  {r.trend.direction === "UP"
                    ? "↑"
                    : r.trend.direction === "DOWN"
                      ? "↓"
                      : "→"}{" "}
                  ({r.trend.delta >= 0 ? "+" : ""}
                  {r.trend.delta})
                </td>
                <td className="text-sm">
                  {r.strengths.map((s) => (
                    <div key={s.exercise}>
                      {s.exercise}: {s.score}
                    </div>
                  ))}
                </td>
                <td className="text-sm">
                  {r.focus.map((f) => (
                    <div key={f.exercise}>
                      {f.exercise}: {f.score}
                    </div>
                  ))}
                </td>
                <td>{r.lastTestDate ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
