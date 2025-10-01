import React, { useEffect, useState } from "react";
import Stats from "@/components/dashboard/Stats";
import RoverList from "@/components/dashboard/RoverList";
import CommandConsole from "@/components/dashboard/CommandConsole";
import RoverControl from "@/components/dashboard/RoverControl";
import SensorDataDisplay from "@/components/rovers/SensorData";
import WaterLevels from "@/components/dashboard/WaterLevels";
import BatteryMeter from "@/components/dashboard/BatteryMeter";

const Dashboard = () => {
  const [selectedRoverId, setSelectedRoverId] = useState<number | undefined>();
  // Dummy simulated data for water levels and battery
  const [cleanPercent, setCleanPercent] = useState<number>(72);
  const [dirtyPercent, setDirtyPercent] = useState<number>(28);
  const [batteryPercent, setBatteryPercent] = useState<number>(86);
  const [charging, setCharging] = useState<boolean>(true);

  useEffect(() => {
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    const id = setInterval(() => {
      // water levels drift slightly and remain complementary
      setCleanPercent((prev) => clamp(prev + (Math.random() * 6 - 3)));
      setDirtyPercent((_, __) => 100);
      // battery drains slowly unless charging
      setBatteryPercent((prev) => {
        const delta = charging ? (Math.random() * 2) : -(Math.random() * 2);
        return clamp(prev + delta);
      });
      // occasionally toggle charging state
      if (Math.random() < 0.15) setCharging((c) => !c);
    }, 2000);
    return () => clearInterval(id);
  }, [charging]);

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor and control your connected rovers
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <WaterLevels cleanPercent={cleanPercent} dirtyPercent={Math.max(0, 100 - cleanPercent)} />
        </div>
        <div className="xl:col-span-1">
          <BatteryMeter percent={batteryPercent} charging={charging} />
        </div>
      </div>

      <div className="mt-6">
        <Stats />
      </div>

      {/*<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <RoverList
            className="mb-6"
            onSelectRover={(roverId) => setSelectedRoverId(Number(roverId))}
          />
        </div>
        {/*<div>
          <CommandConsole selectedRoverId={selectedRoverId} />
        </div>
      </div>*/}
    </>
  );
};

export default Dashboard;
