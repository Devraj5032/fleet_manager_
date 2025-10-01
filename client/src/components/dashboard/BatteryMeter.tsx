import { useId } from "react"

type BatteryMeterProps = {
  percent: number // 0-100
  charging?: boolean
}

const clamp = (v: number) => Math.max(0, Math.min(100, v))

export default function BatteryMeter({ percent, charging = false }: BatteryMeterProps) {
  const p = clamp(percent)
  const color = p < 30 ? "#ef4444" : p < 70 ? "#f59e0b" : "#22c55e"

  // Unique IDs to avoid collisions with multiple meters on the page
  const uid = useId()
  const gradId = `gradBattery-${uid}`
  const glowId = `glow-${uid}`

  return (
    <div className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
              <path d="M16 7h-3l2-5-7 9h3l-2 6 7-10z" />
            </svg>
          </span>
          <span className="text-sm font-medium text-zinc-800">Battery</span>
        </div>
        <div className="flex items-center gap-2">
          {charging && <span className="text-xs text-sky-600">Charging</span>}
          <span className="text-sm font-semibold text-zinc-900">{Math.round(p)}%</span>
        </div>
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="relative h-44 w-44">
          <svg
            viewBox="0 0 120 120"
            className="h-full w-full"
            role="img"
            aria-label={`Battery ${Math.round(p)}%${charging ? ", charging" : ""}`}
          >
            <title>{`Battery ${Math.round(p)}%${charging ? " (charging)" : ""}`}</title>
            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0.6" />
              </linearGradient>
              <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Track */}
            <circle cx="60" cy="60" r="52" stroke="#e5e7eb" strokeWidth="10" fill="none" />

            {/* Progress rotated so it starts at 12 o'clock */}
            <g transform="rotate(-90 60 60)">
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke={`url(#${gradId})`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${Math.PI * 2 * 52}`}
                strokeDashoffset={`${Math.PI * 2 * 52 * (1 - p / 100)}`}
                fill="none"
                style={{ transition: "stroke-dashoffset 800ms ease" }}
                filter={charging ? `url(#${glowId})` : undefined}
              />
            </g>

            {/* Charging bolt */}
            {charging && (
              <g transform="translate(48,34)" fill="#0ea5e9" className="animate-pulse">
                <path d="M16 6h-6l4-10-12 16h6l-4 12 12-18z" />
              </g>
            )}

            <text x="60" y="66" textAnchor="middle" fontSize="20" fill="#111827" fontWeight="600">
              {Math.round(p)}%
            </text>
          </svg>
        </div>
      </div>
    </div>
  )
}
