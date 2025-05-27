"use client";

import React, { useState, useEffect } from "react";
import { Zap, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import RoverList from "@/components/rovers/RoverList";

interface StatsProps {
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  isActive: boolean;
  onClick?: () => void;
}

interface StatsData {
  activeRovers: number;
  inactiveRovers: number;
}

interface Rover {
  id: number;
  name: string;
  identifier: string;
  status: string;
  last_seen: string | null;
  ip_address: string;
  metadata: any;
  created_at: string;
  updated_at: string;
  customer_id: number;
  [key: string]: any;
}

const StatCard = ({
  title,
  value,
  icon,
  color,
  isActive,
  onClick,
}: StatCardProps) => (
  <Card
    onClick={onClick}
    className={`cursor-pointer hover:shadow-lg transition ${
      isActive ? "border-2 border-blue-500 bg-blue-100" : ""
    }`}
  >
    <CardContent className="p-4">
      <div className="flex items-center">
        <div className={`${color} p-3 rounded-full mr-4`}>{icon}</div>
        <div>
          <h3 className="text-muted-foreground text-sm">{title}</h3>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const Stats = ({ className = "" }: StatsProps) => {
  const [activeCard, setActiveCard] = useState<string>("Active Rovers");
  const [activeRovers, setActiveRovers] = useState<Rover[]>([]);

  const { data: inactiveStats, isLoading } = useQuery<StatsData>({
    queryKey: ["inactive-rover-stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 10000,
  });

  // WebSocket for active rovers
  useEffect(() => {
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = window.location.host;
    const ws = new WebSocket(`${wsProtocol}://${wsHost}/ws`);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "TELEMETRY" && msg.roverId) {
        const sensorData = msg.payload.sensorData || {};
        const now = new Date().toISOString();

        setActiveRovers((prev) => {
          const exists = prev.find((r) => r.id === msg.roverId);
          if (exists) {
            return prev.map((r) =>
              r.id === msg.roverId
                ? {
                    ...r,
                    ...sensorData,
                    last_seen: now,
                    updated_at: now,
                    status: "active",
                  }
                : r
            );
          } else {
            return [
              ...prev,
              {
                id: msg.roverId,
                name: `Rover ${msg.roverId}`,
                identifier: `R-${msg.roverId}`,
                status: "active",
                ip_address: "unknown",
                metadata: {},
                created_at: now,
                updated_at: now,
                last_seen: now,
                customer_id: 0,
                ...sensorData,
              },
            ];
          }
        });
      }
    };

    ws.onerror = (e) => console.error("WebSocket error", e);
    ws.onclose = () => console.log("WebSocket closed");

    return () => ws.close();
  }, []);

  const stats = [
    {
      title: "Active Rovers",
      value: activeRovers.length,
      icon: <Zap className="h-6 w-6 text-yellow-300" />,
      color: "bg-yellow-100",
      content: (
        <RoverList
          section="active"
          className="mt-4"
          onSelectRover={() => {}}
        />
      ),
    },
    {
      title: "Inactive Rovers",
      value: inactiveStats?.inactiveRovers ?? 0,
      icon: <XCircle className="h-6 w-6 text-gray-500" />,
      color: "bg-gray-200",
      content: (
        <RoverList
          section="inactive"
          className="mt-4"
          onSelectRover={() => {}}
        />
      ),
    },
  ];

  const selectedStat = stats.find((stat) => stat.title === activeCard);

  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 gap-4 mb-6 ${className}`}>
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-16 animate-pulse bg-muted rounded-md"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
            isActive={activeCard === stat.title}
            onClick={() =>
              setActiveCard(activeCard === stat.title ? null : stat.title)
            }
          />
        ))}
      </div>

      {selectedStat && (
        <div className="bg-white shadow-md rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">{selectedStat.title}</h2>
          {selectedStat.content}
        </div>
      )}
    </div>
  );
};

export default Stats;
