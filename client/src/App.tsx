import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import RoverDetails from "@/pages/rover-details";
import Diagnostics from "@/pages/diagnostics";
import DataLogs from "@/pages/data-logs";
import Settings from "@/pages/settings";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { WebSocketProvider } from "@/lib/websocket";
import Rovers from "@/pages/rovers";
import RobotDashboard from "@/pages/robot-dashboard";
import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function Router() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      <Header onMenuClick={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block">
          <Sidebar />
        </aside>
        
        {/* Mobile Sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/robot-dashboard" component={RobotDashboard} />
            <Route path="/rovers/:id" component={RoverDetails} />{" "}
            <Route path="/rovers" component={Rovers} />{" "}
            <Route path="/diagnostics" component={Diagnostics} />
            <Route path="/data-logs" component={DataLogs} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <Router />
        <Toaster />
      </WebSocketProvider>
    </QueryClientProvider>
  );
}

export default App;
