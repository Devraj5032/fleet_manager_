"use client"

import type React from "react"
import Wave from "react-wavify"

type TankProps = {
  label: string
  percent: number // 0-100
  gradient: { from: string; via?: string; to: string }
  accentGlow: string // e.g. 'shadow-[0_0_20px_rgba(59,130,246,0.6)]'
  icon: React.ReactNode
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

function TankIndicator({ label, percent, gradient, accentGlow, icon }: TankProps) {
  const safePercent = clampPercent(percent)

  return (
    <div className="relative rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-zinc-700">
            {icon}
          </span>
          <span className="text-sm font-medium text-zinc-800">{label}</span>
        </div>
        <span className="text-sm font-semibold text-zinc-900">{Math.round(safePercent)}%</span>
      </div>
      <div className="flex items-end justify-center gap-6">
        <div className={`relative h-48 w-24 rounded-xl border border-zinc-200 bg-zinc-50 ${accentGlow}`}>
          <div className="absolute inset-0 rounded-xl">
            {/* Filled gradient body */}
            <div
              className="absolute inset-x-0 bottom-0 overflow-hidden rounded-b-xl"
              style={{
                height: `${safePercent}%`,
                transition: "height 900ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              <div
                className="h-full w-full"
                style={{
                  backgroundImage: `linear-gradient(to top, ${gradient.from}, ${gradient.via ?? gradient.to}, ${gradient.to})`,
                }}
              />
              {/* Wave overlays anchored to the fill's top (the liquid surface) */}
              <div className="pointer-events-none absolute inset-x-0 top-0">
                <div className="relative h-6 w-full">
                  <Wave
                    fill="rgba(255,255,255,0.5)"
                    paused={false}
                    options={{ height: 3, amplitude: 6, speed: 0.2, points: 3 }}
                    className="absolute inset-0"
                  />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 translate-y-1">
                <div className="relative h-6 w-full">
                  <Wave
                    fill="rgba(255,255,255,0.18)"
                    paused={false}
                    options={{ height: 3, amplitude: 4, speed: 0.13, points: 4 }}
                    className="absolute inset-0"
                  />
                </div>
              </div>
            </div>
            {/* Tank chrome */}
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-zinc-200" />
            <div className="absolute inset-0 rounded-xl [mask-image:radial-gradient(100%_60%_at_50%_0%,black,transparent)]" />
          </div>
        </div>
      </div>
    </div>
  )
}

type WaterLevelsProps = {
  cleanPercent: number
  dirtyPercent: number
}

export default function WaterLevels({ cleanPercent, dirtyPercent }: WaterLevelsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6">
      <TankIndicator
        label="Clean Water Level"
        percent={cleanPercent}
        gradient={{ from: "#22d3ee", via: "#38bdf8", to: "#a5f3fc" }}
        accentGlow="shadow-[0_0_28px_rgba(56,189,248,0.45)]"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M12 2c-2.5 3.8-7 8.1-7 11.5A7 7 0 0 0 12 21a7 7 0 0 0 7-7.5C19 10.1 14.5 5.8 12 2z" />
          </svg>
        }
      />
      <TankIndicator
        label="Dirty Water Level"
        percent={dirtyPercent}
        gradient={{ from: "#a16207", via: "#78350f", to: "#6b7280" }}
        accentGlow="shadow-[0_0_28px_rgba(120,53,15,0.35)]"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M7 2h10v2h3v2h-2l-2 12H8L6 6H4V4h3V2zm3 5h4l1.5 9h-7L10 7z" />
          </svg>
        }
      />
    </div>
  )
}
