import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommand, parseCommand } from "@/lib/commands";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/lib/websocket"; // Import WebSocket handling

import { CommandLog, Rover } from "@shared/schema";

export interface CommandConsoleProps {
  className?: string;
  selectedRoverId?: number | null;
}

const CommandConsole = ({
  className,
  selectedRoverId,
}: CommandConsoleProps) => {
  const [command, setCommand] = useState("");
  const [roverId, setRoverId] = useState<number | null>(
    selectedRoverId ?? null
  );
  const { sendCommand } = useCommand();
  const { toast } = useToast();
  const terminalRef = useRef<HTMLDivElement>(null);
  const lastSubmitRef = useRef<number | null>(null); // Prevent multiple submits

  const { lastMessage } = useWebSocket(); // WebSocket message listener

  const { data: rovers } = useQuery<Rover[]>({
    queryKey: ["/api/rovers"],
  });

  const { data: commandLogs } = useQuery<CommandLog[]>({
    queryKey:
      roverId && roverId !== null
        ? [`/api/rovers/${roverId}/command-logs`]
        : ["/api/command-logs"],
    enabled: !!roverId, //*true,
    refetchInterval: 2000,
  });

  // Scroll to bottom of terminal when logs change
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commandLogs]);

  // Update roverId when selectedRoverId changes
  useEffect(() => {
    setRoverId(selectedRoverId ?? null);
  }, [selectedRoverId]);

  useEffect(() => {
    if (!lastMessage || !lastMessage.payload?.commandId) return;

    console.log("Received WebSocket message:", lastMessage);

    if (!lastMessage.payload.command) {
      toast({
        variant: "warning",
        title: "Invalid Command Received",
        description: `Unexpected command received: ${JSON.stringify(
          lastMessage
        )}`,
      });
      return;
    }

    // Prevent processing the same command twice
    if (lastMessage.payload.commandId === lastSubmitRef.current) {
      console.log("Duplicate WebSocket message detected, ignoring.");
      return;
    }
    lastSubmitRef.current = lastMessage.payload.commandId;

    // Handle the command properly
  }, [lastMessage]);

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    e?.preventDefault(); // Prevent default form submission behavior

    if (!command.trim()) return;
    if (!roverId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a rover",
      });
      return;
    }

    // Prevent double submission using timestamp
    const now = Date.now();
    if (lastSubmitRef.current && now - lastSubmitRef.current < 500) {
      toast({
        variant: "warning",
        title: "Duplicate Command",
        description: "You are trying to send the same command too quickly.",
      });

      return; // Ignore duplicate submits within 500ms
    }
    lastSubmitRef.current = now; // Update last submit time

    // Validate command
    const validation = parseCommand(command);
    if (!validation.isValid) {
      toast({
        variant: "destructive",
        title: "Invalid Command",
        description: validation.error,
      });
      return;
    }
    console.log("Sending command:", { roverId, command });

    try {
      await sendCommand({ roverId, command });
      setCommand("");
      toast({
        variant: "success",
        title: "Command Sent",
        description: `Command "${command}" was successfully sent to Rover ${roverId}.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Command Error",
        description: (error as Error).message,
      });
    }
  };

  /*const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };*/

  // Format log message
  const formatLogMessage = (log: CommandLog) => {
    const timestamp = log.timestamp
      ? new Date(log.timestamp).toLocaleTimeString()
      : "Unknown Time";

    if (log.status === "pending") {
      return `[${timestamp}] Executing: ${log.command}...`;
    } else if (log.status === "success") {
      return `[${timestamp}] Success: ${log.response || log.command}`;
    } else {
      return `[${timestamp}] Failed: ${log.response || "Unknown error"}`;
    }
  };

  // Get log class
  const getLogClass = (status?: string) => {
    switch (status) {
      case "pending":
        return "log-info";
      case "success":
        return "log-success";
      case "failed":
        return "log-error";
      default:
        return "";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle>Command Console</CardTitle>
        <Select
          value={roverId !== null ? roverId.toString() : undefined}
          onValueChange={(value) => setRoverId(value ? Number(value) : null)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select Rover" />
          </SelectTrigger>
          <SelectContent>
            {rovers?.map((rover) => (
              <SelectItem key={rover.id} value={rover.id.toString()}>
                {rover.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="terminal mb-3" ref={terminalRef}>
          <div className="terminal-line log-info">
            [System] Connected to server at {window.location.host}
          </div>

          {!roverId && (
            <div className="terminal-line log-warn">
              [System] Please select a rover to send commands
            </div>
          )}

          {roverId && commandLogs?.length === 0 && (
            <div className="terminal-line log-info">
              [System] No command history for this rover
            </div>
          )}

          {commandLogs?.map((log) => (
            <div
              key={log.id}
              className={`terminal-line ${getLogClass(log.status)}`}
            >
              {formatLogMessage(log)}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex">
          <Input
            type="text"
            placeholder="Enter command..."
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="flex-1 rounded-r-none"
            disabled={!roverId}
          />
          <Button
            type="submit"
            className="rounded-l-none"
            disabled={!roverId || !command.trim()}
          >
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CommandConsole;
