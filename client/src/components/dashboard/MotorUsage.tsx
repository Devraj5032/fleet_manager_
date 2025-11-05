import React, { useMemo } from "react";

type Segment = { start: number; end: number; on: boolean };

type Motor = {
  name: string;
  icon: React.ReactNode;
  color: string; // active color
};

const MOTORS: Motor[] = [
  {
    name: "Vacuum Motor",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M3 12h2a7 7 0 0 1 14 0h2a9 9 0 0 0-18 0zm2 2h14v2H5v-2zm2 4h10v2H7v-2z" />
      </svg>
    ),
    color: "#06b6d4", // cyan
  },
  {
    name: "Cleaning Motor",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M4 15l6-6 4 4 6-6v4h2V3h-8v2h4l-6 6-4-4-8 8z" />
      </svg>
    ),
    color: "#22c55e", // green
  },
  {
    name: "Movement Motor",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M7 7h10v10H7zM2 11h3v2H2v-2zm17 0h3v2h-3v-2zM11 2h2v3h-2V2zm0 17h2v3h-2v-3z" />
      </svg>
    ),
    color: "#f59e0b", // amber
  },
];

function generateDummySegments(seed: number): Segment[] {
  // Create 12 segments (2 hours each) with random on/off blocks
  const segments: Segment[] = [];
  let current = 0;
  const rand = (n: number) => Math.abs(Math.sin(seed++)) % n;
  while (current < 24) {
    const isOn = rand(10) > 6;
    const length = Math.max(0.5, Math.round((rand(4) + 1) * 2) / 2); // 1h to ~5h in 0.5h steps
    const end = Math.min(24, current + length);
    segments.push({ start: current, end, on: isOn });
    current = end;
  }
  return segments;
}

function computeTotalOn(segments: Segment[]): number {
  return segments.reduce((acc, s) => acc + (s.on ? s.end - s.start : 0), 0);
}

function formatHours(totalHours: number): string {
  const minutes = Math.round(totalHours * 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

function MotorRow({ motor, segments }: { motor: Motor; segments: Segment[] }) {
  const totalOn = useMemo(() => computeTotalOn(segments), [segments]);
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
            {motor.icon}
          </span>
          <span className="text-sm font-medium text-zinc-800">{motor.name}</span>
        </div>
        <span className="text-sm font-semibold text-zinc-900">{formatHours(totalOn)}</span>
      </div>

      <div className="relative h-8 w-full overflow-hidden rounded-lg bg-zinc-100">
        {/* timeline background ticks */}
        <div className="absolute inset-0">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="absolute top-0 h-full w-px bg-zinc-200/80"
              style={{ left: `${(i / 24) * 100}%` }}
            />
          ))}
        </div>
        {/* on/off segments */}
        {segments.map((s, idx) => (
          <div
            key={idx}
            className="absolute top-0 h-full"
            style={{
              left: `${(s.start / 24) * 100}%`,
              width: `${((s.end - s.start) / 24) * 100}%`,
              background:
                s.on
                  ? `linear-gradient(90deg, ${motor.color}, ${motor.color})`
                  : `linear-gradient(90deg, #e5e7eb, #e5e7eb)`,
              opacity: s.on ? 1 : 0.6,
              boxShadow: s.on ? `0 0 18px ${motor.color}55` : undefined,
              transition: "filter 300ms ease, opacity 300ms ease",
            }}
          />
        ))}
        {/* animated highlight sweep for active segments */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.65) 50%, rgba(255,255,255,0) 100%)",
            backgroundSize: "200% 100%",
            animation: "sweep 2.5s linear infinite",
            mixBlendMode: "overlay",
          }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>00:00</span>
        <span>12:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}

export default function MotorUsage() {
  // fixed dummy data for today: deterministic segments per motor
  const data = useMemo(() => {
    return MOTORS.map((m, i) => ({ motor: m, segments: generateDummySegments(42 + i * 7) }));
  }, []);

  const totalHoursAll = data.reduce((acc, row) => acc + computeTotalOn(row.segments), 0);

  // inject sweep keyframes once
  if (typeof document !== "undefined") {
    const id = "sweep-keyframes";
    if (!document.getElementById(id)) {
      const style = document.createElement("style");
      style.id = id;
      style.innerHTML = `@keyframes sweep { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`;
      document.head.appendChild(style);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-zinc-900">Motor Usage (Today)</div>
            <div className="text-xs text-zinc-500">ON/OFF timeline with total working time</div>
          </div>
          <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 ring-1 ring-inset ring-zinc-200">
            Total: {formatHours(totalHoursAll)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.map(({ motor, segments }) => (
          <MotorRow key={motor.name} motor={motor} segments={segments} />
        ))}
      </div>
    </div>
  );
}


