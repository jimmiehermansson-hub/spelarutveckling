"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

type TrendPoint = {
  id: string;
  date: string;
  value: number;
  exerciseId: string;
  exerciseName: string;
  unit?: string | null;
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
      <div className="flex justify-center">
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
      </div>

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

export default function PlayerReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [start, setStart] = useState(daysAgoISO(90));
  const [end, setEnd] = useState(todayISO());
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);

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

  useEffect(() => {
    if (data?.table?.length && !selectedExerciseId) {
      setSelectedExerciseId(data.table[0].exerciseId);
    }
  }, [data, selectedExerciseId]);

  useEffect(() => {
    if (!playerId || !selectedExerciseId) return;

    (async () => {
      try {
        const res = await fetch(
          `/api/players/${playerId}/measurements?exerciseId=${selectedExerciseId}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setTrendData(json);
      } catch (e: any) {
        setError(e?.message ?? "Kunde inte ladda trenddata.");
      }
    })();
  }, [playerId, selectedExerciseId]);

  const trendSymbol = useMemo(() => {
    if (!data) return "→";
    if (data.trend.direction === "UP") return "↑";
    if (data.trend.direction === "DOWN") return "↓";
    return "→";
  }, [data]);

  return (
    <main className="min-h-screen p-6 print:p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-blue-600 hover:underline mb-2 block print:hidden"
          >
            ← Till Dashboard
          </Link>
          <h1 className="text-2xl font-semibold">Spelarrapport</h1>
          {data && (
            <>
              <div className="mt-2 text-lg font-medium">{data.player.name}</div>
              <div className="text-sm opacity-70">
                {data.player.team} • {data.player.primaryPosition ?? "-"} •{" "}
                {data.player.birthYear ?? "-"}
              </div>
            </>
          )}
        </div>

        <div className="print:hidden flex gap-2">
          <button
            className="border rounded px-4 py-2 hover:bg-gray-50 transition-colors"
            onClick={() => window.print()}
          >
            Skriv ut / Spara PDF
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
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
      </div>

      {loading && <p className="mt-4">Laddar rapport…</p>}
      {error && <p className="mt-4 text-red-600">Fel: {error}</p>}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-xl p-4">
              <div className="text-sm opacity-70">Total status</div>
              <div className="text-3xl font-bold mt-1">
                {data.totalStatus ?? "–"}
              </div>
              <div className="mt-2 font-medium">
                Trend: {trendSymbol} ({data.trend.delta >= 0 ? "+" : ""}
                {data.trend.delta})
              </div>
              <div className="mt-2 text-sm opacity-70">
                Period: {data.meta.start} – {data.meta.end}
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-2">Styrkor</h3>
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
                {data.strengths.length === 0 && (
                  <p className="text-sm opacity-50 italic">
                    Inga specifika styrkor noterade.
                  </p>
                )}
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-2">Fokusområden</h3>
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
                {data.focus.length === 0 && (
                  <p className="text-sm opacity-50 italic">
                    Inga specifika fokusområden noterade.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 border rounded-xl p-4 print:hidden">
            <h3 className="font-semibold mb-3">Trend över tid</h3>

            <div className="mb-4">
              <label className="block text-sm mb-1">Välj övning</label>
              <select
                className="w-full max-w-md rounded border border-gray-300 bg-transparent px-3 py-2 text-sm text-inherit outline-none transition-colors focus:border-gray-500"
                value={selectedExerciseId}
                onChange={(e) => setSelectedExerciseId(e.target.value)}
              >
                {data.table.map((row) => (
                  <option
                    key={row.exerciseId}
                    value={row.exerciseId}
                    className="bg-white text-black"
                  >
                    {row.exercise}
                  </option>
                ))}
              </select>
            </div>

            {trendData.length === 0 ? (
              <p className="text-sm opacity-70">
                Ingen historik finns ännu för vald övning.
              </p>
            ) : (
              <div>
                <div className="mb-4 text-sm opacity-80">
                  Antal mätpunkter: {trendData.length}
                  {trendData[0]?.unit ? ` • Enhet: ${trendData[0].unit}` : ""}
                </div>

                <div className="h-72 w-full min-h-[300px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={300}
                  >
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(str) =>
                          new Date(str).toLocaleDateString("sv-SE", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(label) =>
                          new Date(label).toLocaleDateString("sv-SE", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        }
                        formatter={(value) => {
                          const unit = trendData[0]?.unit;
                          return unit
                            ? [`${value} ${unit}`, "Värde"]
                            : [value, "Värde"];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <RadarMini data={data.radar} />

            <div className="border rounded-xl p-4">
              <h3 className="font-semibold mb-3">Detaljer per övning</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Övning</th>
                      <th className="px-2 text-right">Råvärde</th>
                      <th className="px-2 text-right">Score</th>
                      <th className="px-2 text-right">Delta</th>
                      <th className="pl-2 text-right">Median</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.table.map((row) => (
                      <tr
                        key={row.exerciseId}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-2 pr-4 font-medium">
                          {row.exercise}
                        </td>
                        <td className="px-2 text-right">
                          {row.latestRaw ?? "-"}
                        </td>
                        <td className="px-2 text-right">
                          {row.latestScore ?? "-"}
                        </td>
                        <td className="px-2 text-right">
                          {row.deltaScore == null
                            ? "-"
                            : `${row.deltaScore >= 0 ? "+" : ""}${row.deltaScore}`}
                        </td>
                        <td className="pl-2 text-right">
                          {row.teamScore ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
