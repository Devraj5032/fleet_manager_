import React, { useState } from "react";
import Stats from "@/components/dashboard/Stats";
import RoverList from "@/components/dashboard/RoverList";
import CommandConsole from "@/components/dashboard/CommandConsole";
import RoverControl from "@/components/dashboard/RoverControl";
import SensorDataDisplay from "@/components/rovers/SensorData";

const Dashboard = () => {
  const [selectedRoverId, setSelectedRoverId] = useState<number | undefined>();

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Dashboard</h2>
        <p className="text-muted-foreground">
          Monitor and control your connected rovers
        </p>
      </div>

      <Stats />

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
