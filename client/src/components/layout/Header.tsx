import React from "react";
import { useWebSocket } from "@/lib/websocket";
import { Bolt, Settings, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  onMenuClick?: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
  const { connected } = useWebSocket();

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 5000,
  });

  return (
    <header className="bg-primary text-white shadow-md">
      <div className="container mx-auto px-3 md:px-4 py-2 md:py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-white hover:bg-white/20 p-2"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Bolt className="h-6 w-6 md:h-8 md:w-8" />
          <h1 className="text-base md:text-xl font-bold truncate">
            <span className="hidden sm:inline">Rover Command & Control System</span>
            <span className="sm:hidden">Rover C&C</span>
          </h1>
        </div>

        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="hidden sm:flex items-center text-sm">
            <span className="mr-2">Server Status:</span>
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 ${
                connected
                  ? "bg-green-400 shadow-sm shadow-green-300"
                  : "bg-red-500"
              }`}
            ></span>
            <span>{connected ? "Connected" : "Disconnected"}</span>
          </div>
          {/* Mobile Status Indicator */}
          <div className="sm:hidden">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                connected
                  ? "bg-green-400 shadow-sm shadow-green-300"
                  : "bg-red-500"
              }`}
              title={connected ? "Connected" : "Disconnected"}
            ></span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="p-2 md:px-3"
            onClick={() => (window.location.href = "/settings")}
          >
            <Settings className="h-4 w-4 md:mr-1" />
            <span className="hidden md:inline">Settings</span>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
