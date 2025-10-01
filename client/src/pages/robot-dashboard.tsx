import React, { useEffect, useState } from "react";
import WaterLevels from "@/components/dashboard/WaterLevels";
import BatteryMeter from "@/components/dashboard/BatteryMeter";

export default function RobotDashboard() {
  const [cleanPercent, setCleanPercent] = useState<number>(68);
  const [dirtyPercent, setDirtyPercent] = useState<number>(32);
  const [batteryPercent, setBatteryPercent] = useState<number>(78);
  const [charging, setCharging] = useState<boolean>(false);

  useEffect(() => {
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    const id = setInterval(() => {
      setCleanPercent((prev) => clamp(prev + (Math.random() * 4 - 2)));
      setDirtyPercent(() => 100);
      setBatteryPercent((prev) => {
        const delta = charging ? (Math.random() * 1.6) : -(Math.random() * 1.6);
        return clamp(prev + delta);
      });
      if (Math.random() < 0.1) setCharging((c) => !c);
    }, 2000);
    return () => clearInterval(id);
  }, [charging]);

  return (
    <div className="relative -m-6 bg-zinc-50 p-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Robot Dashboard</h2>
              <p className="text-sm text-zinc-600">Industrial status at a glance</p>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">Live</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">Touch Optimized</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">Light UI</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <WaterLevels cleanPercent={cleanPercent} dirtyPercent={Math.max(0, 100 - cleanPercent)} />
          </div>
          <div className="xl:col-span-1">
            <BatteryMeter percent={batteryPercent} charging={charging} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Mode</div>
            <div className="mt-2 text-lg font-semibold text-zinc-900">Autonomous</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Network</div>
            <div className="mt-2 text-lg font-semibold text-zinc-900">Online</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-zinc-500">Last Sync</div>
            <div className="mt-2 text-lg font-semibold text-zinc-900">Just now</div>
          </div>
        </div>
      </div>
    </div>
  );
}


