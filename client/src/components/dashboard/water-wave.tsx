"use client"
import Wave from "react-wavify"
import { cn } from "@/lib/utils"

type WaterWaveTankProps = {
  value: number // 0-100
  className?: string
  // Colors in hex; keep palette minimal and high-contrast
  fillColor?: string // main liquid color e.g. '#0ea5e9'
  fillAccentColor?: string // subtle second wave color e.g. '#38bdf8'
  backgroundColor?: string // tank background e.g. 'bg-muted'
  borderColor?: string // optional border color utility
  label?: string
}

export function WaterWaveTank({
  value,
  className,
  fillColor = "#0ea5e9", // cyan-500
  fillAccentColor = "#38bdf8", // sky-400
  backgroundColor = "bg-background",
  borderColor,
  label,
}: WaterWaveTankProps) {
  const pct = Math.max(0, Math.min(100, value))

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-sm font-medium">{pct}%</span>
        </div>
      ) : null}

      <div
        className={cn(
          // tank outer
          "relative w-full aspect-[3/5] rounded-2xl overflow-hidden",
          backgroundColor,
          borderColor ? borderColor : "border border-border",
          "shadow-sm",
        )}
        role="img"
        aria-label={label ? `${label}: ${pct}%` : `Water level: ${pct}%`}
      >
        {/* Tank background */}
        <div className="absolute inset-0" />

        {/* Liquid fill height container */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: `${pct}%`,
            transition: "height 600ms ease",
          }}
          aria-hidden="true"
        >
          {/* Two layered waves for subtle parallax */}
          <div className="absolute inset-x-0 bottom-0 h-full">
            <Wave
              fill={fillAccentColor + "cc" /* ~80% opacity */}
              paused={false}
              options={{
                height: 8, // baseline vertical wave position inside this container
                amplitude: 6,
                speed: 0.25,
                points: 3,
              }}
              className="absolute inset-x-0 bottom-0"
              style={{ height: "110%", width: "100%" }}
            />
            <Wave
              fill={fillColor + "e6" /* ~90% opacity */}
              paused={false}
              options={{
                height: 10,
                amplitude: 9,
                speed: 0.35,
                points: 4,
              }}
              className="absolute inset-x-0 bottom-0"
              style={{ height: "110%", width: "100%" }}
            />
          </div>
        </div>

        {/* Foreground gloss */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/5" />
      </div>
    </div>
  )
}

export default WaterWaveTank
