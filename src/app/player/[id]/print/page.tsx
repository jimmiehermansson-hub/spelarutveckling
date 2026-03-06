"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ReportResponse = {
  meta: { generatedAt: string; start: string; end: string };
  player: {
    id: string;
    name: string;
    birthYear?: number | null;
    primaryPosition?: string | null;
    team: string;
    imageUrl?: string | null;
  };
  totalStatus: number | null;
  insufficientData: boolean;
  trend: { direction: "UP" | "DOWN" | "NEUTRAL"; delta: number };
  strengths: {
    exercise: string;
    latestRaw: number | null;
    latestScore: number | null;
    deltaScore: number | null;
    teamScore: number | null;
  }[];
  focus: {
    exercise: string;
    latestRaw: number | null;
    latestScore: number | null;
    deltaScore: number | null;
    teamScore: number | null;
  }[];
  radar: {
    exercise: string;
    playerScore: number | null;
    teamScore: number | null;
  }[];
  table: {
    exerciseId: string;
    exercise: string;
    latestRaw: number | null;
    latestScore: number | null;
    deltaScore: number | null;
    teamScore: number | null;
  }[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function RadarMini({
  data,
}: {
  data: {
    exercise: string;
    playerScore: number | null;
    teamScore: number | null;
  }[];
}) {
  const points = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
    const r = ((d.playerScore ?? 0) / 100) * 90;
    const x = 110 + Math.cos(angle) * r;
    const y = 110 + Math.sin(angle) * r;
    return `${x},${y}`;
  });

  const teamPoints = data.map((d, i) => {
    const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
    const r = ((d.teamScore ?? 0) / 100) * 90;
    const x = 110 + Math.cos(angle) * r;
    const y = 110 + Math.sin(angle) * r;
    return `${x},${y}`;
  });

  return (
    <div className="border rounded-xl p-4">
      <h3 className="font-semibold mb-3">Radar (6 core-övningar)</h3>
      <svg width="220" height="220" viewBox="0 0 220 220">
        {[25, 50, 75, 100].map((ring) => (
          <circle
            key={ring}
            cx="110"
            cy="110"
            r={(ring / 100) * 90}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1"
          />
        ))}

        {data.map((d, i) => {
          const angle = (Math.PI * 2 * i) / data.length - Math.PI / 2;
          const x = 110 + Math.cos(angle) * 90;
          const y = 110 + Math.sin(angle) * 90;
          return (
            <line
              key={d.exercise}
              x1="110"
              y1="110"
              x2={x}
              y2={y}
              stroke="#d1d5db"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={teamPoints.join(" ")}
          fill="rgba(59,130,246,0.18)"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        <polygon
          points={points.join(" ")}
          fill="rgba(16,185,129,0.18)"
          stroke="#10b981"
          strokeWidth="2"
        />
      </svg>

      <div className="mt-3 space-y-1 text-sm">
        {data.map((d) => (
          <div key={d.exercise} className="flex justify-between gap-4">
            <span>{d.exercise}</span>
            <span>
              Spelare: {d.playerScore ?? "-"} | Lag: {d.teamScore ?? "-"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PlayerPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = daysAgoISO(90);
  const end = todayISO();

  useEffect(() => {
    params.then((p) => setPlayerId(p.id));
  }, [params]);

  useEffect(() => {
    if (!playerId) return;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/reports/player?playerId=${playerId}&start=${start}&end=${end}&includeTeamAvg=true`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [playerId, start, end]);

  const trendSymbol = useMemo(() => {
    if (!data) return "→";
    if (data.trend.direction === "UP") return "↑";
    if (data.trend.direction === "DOWN") return "↓";
    return "→";
  }, [data]);

  return (
    <main className="min-h-screen bg-white text-black p-6 print:p-4">
      <div className="print:hidden flex items-center justify-between mb-6">
        <Link
          href={`/players/${playerId ?? ""}`}
          className="text-blue-600 underline"
        >
          ← Tillbaka till spelarsidan
        </Link>

        <button
          className="border rounded px-4 py-2"
          onClick={() => window.print()}
        >
          Skriv ut / Spara PDF
        </button>
      </div>

      {loading && <p>Laddar rapport…</p>}
      {error && <p className="text-red-600">Fel: {error}</p>}

      {data && (
        <div className="max-w-5xl mx-auto">
          <header className="mb-6 border-b pb-4">
            <h1 className="text-3xl font-bold">Spelarrapport</h1>
            <div className="mt-2 text-lg font-medium">{data.player.name}</div>
            <div className="text-sm opacity-70">
              {data.player.team} • {data.player.primaryPosition ?? "-"} •{" "}
              {data.player.birthYear ?? "-"}
            </div>
            <div className="mt-2 text-sm opacity-70">
              Period: {data.meta.start} – {data.meta.end}
            </div>
          </header>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="border rounded-xl p-4">
              <div className="text-sm opacity-70">Total status</div>
              <div className="text-4xl font-bold mt-1">
                {data.totalStatus ?? "–"}
              </div>
              <div className="mt-2">
                Trend: {trendSymbol} ({data.trend.delta >= 0 ? "+" : ""}
                {data.trend.delta})
              </div>
              {data.insufficientData && (
                <div className="mt-2 text-sm text-red-600">
                  Begränsat underlag
                </div>
              )}
            </div>

            <div className="border rounded-xl p-4">
              <h2 className="font-semibold mb-2">Styrkor</h2>
              <div className="space-y-2">
                {data.strengths.map((s) => (
                  <div key={s.exercise}>
                    <div className="font-medium">{s.exercise}</div>
                    <div className="text-sm opacity-80">
                      Score: {s.latestScore ?? "-"} | Råvärde:{" "}
                      {s.latestRaw ?? "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <h2 className="font-semibold mb-2">Fokusområden</h2>
              <div className="space-y-2">
                {data.focus.map((f) => (
                  <div key={f.exercise}>
                    <div className="font-medium">{f.exercise}</div>
                    <div className="text-sm opacity-80">
                      Score: {f.latestScore ?? "-"} | Råvärde:{" "}
                      {f.latestRaw ?? "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mb-6">
            <RadarMini data={data.radar} />
          </section>

          <section className="border rounded-xl p-4">
            <h2 className="font-semibold mb-3">Detaljer per övning</h2>
            <div className="overflow-x-auto">
              <table className="min-w-[800px] border-collapse w-full">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">Övning</th>
                    <th>Senaste råvärde</th>
                    <th>Score</th>
                    <th>Delta</th>
                    <th>Median</th>
                  </tr>
                </thead>
                <tbody>
                  {data.table.map((row) => (
                    <tr key={row.exerciseId} className="border-b">
                      <td className="py-2">{row.exercise}</td>
                      <td>{row.latestRaw ?? "-"}</td>
                      <td>{row.latestScore ?? "-"}</td>
                      <td>
                        {row.deltaScore == null
                          ? "-"
                          : `${row.deltaScore >= 0 ? "+" : ""}${row.deltaScore}`}
                      </td>
                      <td>{row.teamScore ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="mt-6 text-xs opacity-60">
            Genererad: {new Date(data.meta.generatedAt).toLocaleString("sv-SE")}
          </footer>
        </div>
      )}
    </main>
  );
}
