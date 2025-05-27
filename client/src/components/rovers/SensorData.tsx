import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { SensorData as SensorDataType } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface SensorDataProps {
  className?: string;
  roverId: number;
}

const SensorDataDisplay = ({ className, roverId }: SensorDataProps) => {
  const { data: sensorData, isLoading } = useQuery<SensorDataType[]>({
    queryKey: [`/api/rovers/${roverId}/sensor-data`],
    refetchInterval: 2000,
  });

  const latestSensorData = sensorData?.[0] || null;

  const chartData = sensorData
    ? [...sensorData]
        .reverse()
        .slice(0, 20)
        .map((data) => ({
          time: new Date(data.timestamp).toLocaleTimeString(),
          temperature: data.temperature,
          batteryLevel: data.batteryLevel,
          speed: data.speed,
        }))
    : [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Sensor Data & Telemetry</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Environment Sensors Graph */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Environment Graph</h4>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 h-72">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 12 }}
                      label={{ value: "Time", position: "insideBottomRight", offset: -5 }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      label={{ value: "Values", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="temperature"
                      stroke="#34D399"
                      fill="#D1FAE5"
                      name="Temperature (°C)"
                      dot
                    />
                    <Area
                      type="monotone"
                      dataKey="batteryLevel"
                      stroke="#60A5FA"
                      fill="#DBEAFE"
                      name="Battery (%)"
                      dot
                    />
                    <Area
                      type="monotone"
                      dataKey="speed"
                      stroke="#FBBF24"
                      fill="#FEF3C7"
                      name="Speed (m/s)"
                      dot
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No sensor data available
                </div>
              )}
            </div>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-3 rounded border border-gray-200 text-center">
              <div className="text-xs text-muted-foreground">Temperature</div>
              <div className="font-semibold text-lg">
                {latestSensorData?.temperature?.toFixed(1) ?? "--"}°C
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200 text-center">
              <div className="text-xs text-muted-foreground">Battery</div>
              <div className="font-semibold text-lg">
                {latestSensorData?.batteryLevel?.toFixed(0) ?? "--"}%
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded border border-gray-200 text-center">
              <div className="text-xs text-muted-foreground">Speed</div>
              <div className="font-semibold text-lg">
                {latestSensorData?.speed?.toFixed(1) ?? "--"} m/s
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SensorDataDisplay;
