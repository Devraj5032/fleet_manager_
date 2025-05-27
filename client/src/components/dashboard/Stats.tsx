import React, { useState } from "react";
import {
  Shield,
  Zap,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import RoverList from "@/components/dashboard/RoverList";

export interface StatsProps {
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
  registeredRovers: number;
  enabledRovers: number;
  activeRovers: number;
  inactiveRovers: number;
  systemLogs: number;
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
  const [activeCard, setActiveCard] = useState<string | null>(
    "Registered Rovers"
  );

  const { data, isLoading } = useQuery<StatsData>({
    queryKey: ["stats"],
    queryFn: async () => {
      const [roversRes, statsRes] = await Promise.all([
        fetch("/api/rovers"),
        fetch("/api/stats"),
      ]);

      if (!roversRes.ok || !statsRes.ok) {
        throw new Error("Failed to fetch rover stats");
      }

      const roversJson = await roversRes.json();
      const statsJson = await statsRes.json();

      const rovers = roversJson.data ?? [];

      return {
        registeredRovers: rovers.length,
        enabledRovers: rovers.filter((r: any) =>
          ["enabled", "idle", "active"].includes((r.status || "").toLowerCase())
        ).length,
        activeRovers: statsJson.activeRovers ?? 0,
        inactiveRovers: statsJson.inactiveRovers ?? 0,
        systemLogs: statsJson.systemLogs ?? 0,
      };
    },
    refetchInterval: 10000,
  });

  const stats = [
    {
      title: "Registered Rovers",
      value: data?.registeredRovers ?? 0,
      icon: <Shield className="h-6 w-6 text-primary" />,
      color: "bg-primary/10",
      content: <RoverList section="registered" />,
    },
    {
      title: "Enabled Rovers",
      value: data?.enabledRovers ?? 0,
      icon: <CheckCircle className="h-6 w-6 text-green-600" />,
      color: "bg-green-100",
      content: <RoverList section="enabled" />,
    },
    {
      title: "Active Rovers",
      value: data?.activeRovers ?? 0,
      icon: <Zap className="h-6 w-6 text-yellow-300" />,
      color: "bg-secondary/10",
      content: <RoverList section="active" />,
    },
    {
      title: "Inactive Rovers",
      value: data?.inactiveRovers ?? 0,
      icon: <XCircle className="h-6 w-6 text-accent-100" />,
      color: "bg-gray-100",
      content: <RoverList section="inactive" />,
    },
    {
      title: "System Logs",
      value: data?.systemLogs ?? 0,
      icon: <AlertCircle className="h-6 w-6 text-destructive" />,
      color: "bg-accent/10",
      content: <p className="p-4 bg-red-100 rounded">System Logs Details...</p>,
    },
  ];

  const selectedStat = stats.find((stat) => stat.title === activeCard);

  if (isLoading) {
    return (
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 ${className}`}
      >
        {[...Array(5)].map((_, i) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
