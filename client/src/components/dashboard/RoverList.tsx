"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Server, Clock, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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
  // Allow sensor fields dynamically
  [key: string]: any;
}

interface ApiResponse {
  success: boolean;
  data: Rover[];
}

interface RoverListProps {
  section: "registered" | "enabled" | "inactive" | "active";
  className?: string;
  onSelectRover?: (roverId: number | null) => void;
}

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case "ACTIVE":
      return "bg-green-100 text-green-800";
    case "REGISTERED":
      return "bg-blue-100 text-blue-800";
    case "OFFLINE":
      return "bg-gray-100 text-gray-800";
    case "ERROR":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getTimeAgo = (timestamp: string | null) => {
  if (!timestamp) return "Never connected";
  return formatDistanceToNow(parseISO(timestamp), { addSuffix: true });
};

const RoverList: React.FC<RoverListProps> = ({
  section,
  className,
  onSelectRover,
}) => {
  const [rovers, setRovers] = useState<Rover[]>([]);
  const [selectedRover, setSelectedRover] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRovers = async () => {
    try {
      setIsLoading(true);
      let endpoint = "/api/rovers";
      if (section === "enabled") endpoint = "/api/rovers?status=enabled";
      else if (section === "inactive") endpoint = "/api/rovers?status=inactive";
      const res = await axios.get<ApiResponse>(endpoint);
      if (res.data.success) setRovers(res.data.data);
      else throw new Error("Failed to fetch rovers");
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch rovers"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (section === "active") {
      setIsLoading(false);
      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
      const wsHost = window.location.host;
      const ws = new WebSocket(`${wsProtocol}://${wsHost}/ws`);

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "TELEMETRY" && msg.roverId) {
          const sensorData = msg.payload.sensorData || {};
          console.log(msg)
          const now = new Date().toISOString();

          setRovers((prev) => {
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
                  identifier: `${msg.roverIdentifier}`,
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
    } else {
      fetchRovers();
      const interval = setInterval(fetchRovers, 10000);
      return () => clearInterval(interval);
    }
  }, [section]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader><CardTitle>Loading Rovers...</CardTitle></CardHeader>
        <CardContent>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full mb-3" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader><CardTitle>Error</CardTitle></CardHeader>
        <CardContent>
          <div className="text-red-500">{error.message}</div>
          <Button onClick={fetchRovers}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{section.charAt(0).toUpperCase() + section.slice(1)} Rovers</CardTitle>
      </CardHeader>
      <CardContent>
        {rovers.length ? (
          rovers.map((rover) => (
            <div
              key={rover.id}
              className={`p-4 border rounded-lg mb-3 ${
                selectedRover === rover.id
                  ? "border-blue-500 bg-blue-50"
                  : "bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-blue-500" />
                  <h3 className="font-medium text-lg">{rover.name}</h3>
                  <Badge variant="outline" className="ml-2">{rover.identifier}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(rover.status)}>{rover.status}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() =>
                      setSelectedRover(selectedRover === rover.id ? null : rover.id)
                    }
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selectedRover === rover.id && (
                <div className="mt-3 bg-white p-3 rounded-md border">
                  <Tabs defaultValue="details">
                    <TabsList className="mb-2">
                      <TabsTrigger value="details">Details</TabsTrigger>
                      <TabsTrigger value="network">Network</TabsTrigger>
                      <TabsTrigger value="timestamps">Timestamps</TabsTrigger>
                    </TabsList>
                    <TabsContent value="details">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium">ID:</div><div>{rover.id}</div>
                        <div className="font-medium">Name:</div><div>{rover.name}</div>
                        <div className="font-medium">Identifier:</div><div>{rover.identifier}</div>
                        <div className="font-medium">Status:</div><div>{rover.status}</div>
                        <div className="font-medium">Customer ID:</div><div>{rover.customer_id}</div>
                      </div>
                    </TabsContent>
                    <TabsContent value="network">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium">IP Address:</div><div>{rover.ip_address}</div>
                        <div className="font-medium">Last Seen:</div>
                        <div><Clock className="h-4 w-4 mr-1 text-blue-500 inline" />{getTimeAgo(rover.last_seen)}</div>
                      </div>
                    </TabsContent>
                    <TabsContent value="timestamps">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="font-medium">Created:</div><div>{new Date(rover.created_at).toLocaleString()}</div>
                        <div className="font-medium">Updated:</div><div>{new Date(rover.updated_at).toLocaleString()}</div>
                      </div>
                    </TabsContent>
                  </Tabs>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectRover?.(rover.id)}
                    >
                      Select Rover
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground">No rovers found.</div>
        )}
        <div className="mt-4 flex justify-between">
          <Button variant="outline" size="sm" onClick={fetchRovers}>Refresh</Button>
          <div className="text-xs text-muted-foreground">Auto-refreshes every 10s</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RoverList;
