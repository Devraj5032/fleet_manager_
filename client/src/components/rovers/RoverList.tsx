"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { BatteryFull, Clock } from "lucide-react";

export interface Rover {
  id: number;
  name: string;
  identifier: string;
  status: string;
  connected: boolean;
  batteryLevel?: number;
  lastSeen?: string;
  ip_address?: string;
  metadata?: any;
  created_at?: string;
  updated_at?: string;
  customer_id?: number;
  [key: string]: any;
}

export interface RoverListProps {
  className?: string;
  onSelectRover?: (roverId: number | null) => void;
}

const getStatusIndicator = (status?: string, connected?: boolean) => {
  if (!connected) return "connection-dot connection-disconnected";
  switch (status) {
    case "active": return "connection-dot connection-active";
    case "idle": return "connection-dot connection-idle";
    case "error": return "connection-dot connection-error";
    default: return "connection-dot connection-disconnected";
  }
};

const getStatusLabel = (status?: string, connected?: boolean) => {
  if (!connected) return "Disconnected";
  switch (status) {
    case "active": return "Online";
    case "idle": return "Idle";
    case "error": return "Error";
    default: return "Disconnected";
  }
};

const getStatusLabelColor = (status?: string, connected?: boolean) => {
  if (!connected) return "bg-gray-100 text-gray-800";
  switch (status) {
    case "active": return "bg-green-100 text-green-800";
    case "idle": return "bg-yellow-100 text-yellow-800";
    case "error": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const getTimeAgo = (timestamp: string | undefined | null) => {
  if (!timestamp) return "N/A";
  return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
};

const RoverList = ({ className, onSelectRover }: RoverListProps) => {
  const [rovers, setRovers] = useState<Rover[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    setIsLoading(false);
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsHost = window.location.host;
    const ws = new WebSocket(`${wsProtocol}://${wsHost}/ws`);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "TELEMETRY" && msg.roverId) {
        const sensorData = msg.payload.sensorData || {};
        const now = new Date().toISOString();

        console.log(msg.roverId)

        setRovers((prev) => {
          const exists = prev.find((r) => r.id === msg.roverId);
          if (exists) {
            return prev.map((r) =>
              r.id === msg.roverId
                ? {
                    ...r,
                    ...sensorData,
                    lastSeen: now,
                    updated_at: now,
                    status: "active",
                    connected: true,
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
                connected: true,
                ip_address: "unknown",
                metadata: {},
                created_at: now,
                updated_at: now,
                lastSeen: now,
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

  const activeRovers = rovers.filter((r) => r.status === "active");

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Active Rovers (Live)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          [...Array(3)].map((_, idx) => <Skeleton key={idx} className="h-24 w-full mb-3" />)
        ) : activeRovers.length > 0 ? (
          <>
            {activeRovers.map((rover) => (
              <div
                key={rover.id}
                className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className={getStatusIndicator(rover.status, rover.connected)} />
                    <h4 className="font-medium">{rover.name}</h4>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${getStatusLabelColor(rover.status, rover.connected)}`}>
                    {getStatusLabel(rover.status, rover.connected)}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 text-sm text-muted-foreground gap-2">
                  <div>ID: <span className="font-mono">{rover.identifier}</span></div>
                  <div className="flex flex-wrap items-center gap-3">
                    {rover.batteryLevel !== undefined && (
                      <div className="flex items-center gap-1">
                        <BatteryFull size={18} color="green" />
                        <span>{rover.batteryLevel}%</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock size={18} color="blue" />
                      <span>{getTimeAgo(rover.lastSeen)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex space-x-2">
                  <Link href={`/rovers/${rover.id}`}>
                    <Button variant="outline" size="sm">View Details</Button>
                  </Link>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No active rovers found. Waiting for telemetry...
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RoverList;
