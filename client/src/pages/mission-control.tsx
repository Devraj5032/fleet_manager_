"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Compass,
  Globe,
  MapPin,
  Radio,
  Satellite,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

const sparkVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.05 * i, duration: 0.4, ease: "easeOut" },
  }),
};

const pulseHighlight = "bg-gradient-to-br from-teal-500/20 via-cyan-500/10 to-transparent border border-teal-500/30";

const coverageTrend = [
  { time: "00:00", coverage: 42, faults: 1 },
  { time: "04:00", coverage: 55, faults: 0 },
  { time: "08:00", coverage: 71, faults: 2 },
  { time: "12:00", coverage: 88, faults: 0 },
  { time: "16:00", coverage: 96, faults: 1 },
  { time: "20:00", coverage: 82, faults: 0 },
];

const energyProfile = [
  { label: "Dock A", throughput: 62 },
  { label: "Dock B", throughput: 48 },
  { label: "Zone North", throughput: 38 },
  { label: "Zone South", throughput: 54 },
];

const liveInsights = [
  { label: "Fleet Health", value: "92%", change: "+4%", icon: ShieldCheck },
  { label: "Active Missions", value: "12", change: "+3", icon: Satellite },
  { label: "Average Runtime", value: "18.4h", change: "-0.7h", icon: Activity },
  { label: "Energy Reserve", value: "74%", change: "+6%", icon: BatteryCharging },
];

const missionFeed = [
  { id: 1, label: "Rover-04 recalibrated sensors", time: "2 min ago", severity: "info" },
  { id: 2, label: "Rover-09 battery sag detected", time: "8 min ago", severity: "warning" },
  { id: 3, label: "Rover-02 docked at Hub-B", time: "13 min ago", severity: "success" },
  { id: 4, label: "Rover-06 obstacle reroute", time: "20 min ago", severity: "info" },
];

const missionTimeline = [
  { id: "A1", title: "Night Sweep Alpha", progress: 84, eta: "00:42", owner: "Autonomous" },
  { id: "B2", title: "Dock Sanitization", progress: 56, eta: "01:15", owner: "Ops" },
  { id: "C3", title: "Spot Check South", progress: 31, eta: "02:04", owner: "Autonomous" },
];

const signalQuality = [
  { rover: "Rover-01", signal: 92, region: "Atrium" },
  { rover: "Rover-04", signal: 78, region: "Lab Wing" },
  { rover: "Rover-07", signal: 65, region: "Dock" },
  { rover: "Rover-09", signal: 58, region: "Parking" },
];

const severityBadge = {
  warning: "text-amber-500 bg-amber-500/10",
  info: "text-sky-500 bg-sky-500/10",
  success: "text-emerald-500 bg-emerald-500/10",
};

function MissionControlDashboard() {
  const fleetSummary = useMemo(
    () => ({
      active: 12,
      docked: 4,
      alerts: 2,
      uptime: "99.2%",
    }),
    []
  );

  return (
    <div className="space-y-8">
      <motion.div
        className={`rounded-3xl p-6 md:p-8 relative overflow-hidden ${pulseHighlight}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute right-10 -top-10 w-60 h-60 bg-teal-400 blur-[120px] opacity-20" />
          <div className="absolute left-10 bottom-0 w-48 h-48 bg-cyan-500 blur-[120px] opacity-30" />
        </div>
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-teal-300">Mission Control</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mt-2">Unified Rover Command Center</h1>
            <p className="text-white/70 mt-4 max-w-2xl">
              Live operational picture for the entire CleanRover fleet. Monitor telemetry, commands, anomalies,
              and mission cadence without leaving this screen.
            </p>
          </div>
          <motion.div
            className="bg-black/30 border border-white/10 rounded-2xl p-4 text-white w-full lg:w-auto"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="text-xs uppercase tracking-widest text-white/60 mb-2">Fleet Snapshot</div>
            <div className="grid grid-cols-2 gap-4 text-white">
              <div>
                <p className="text-3xl font-semibold">{fleetSummary.active}</p>
                <p className="text-xs text-white/60">Active Rovers</p>
              </div>
              <div>
                <p className="text-3xl font-semibold">{fleetSummary.uptime}</p>
                <p className="text-xs text-white/60">Network Uptime</p>
              </div>
              <div>
                <p className="text-3xl font-semibold">{fleetSummary.docked}</p>
                <p className="text-xs text-white/60">Docked</p>
              </div>
              <div>
                <p className="text-3xl font-semibold text-amber-300">{fleetSummary.alerts}</p>
                <p className="text-xs text-white/60">Open Alerts</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {liveInsights.map((item, i) => (
          <motion.div
            key={item.label}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={sparkVariants}
            className="bg-card border border-border rounded-2xl p-5 shadow-sm h-full"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-semibold mt-2">{item.value}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted">
                <item.icon className="h-5 w-5 text-teal-500" />
              </div>
            </div>
            <p className={`text-sm font-medium mt-4 ${item.change.startsWith("-") ? "text-rose-500" : "text-emerald-500"}`}>
              {item.change} vs last cycle
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div
          className="bg-card border border-border rounded-3xl p-6 shadow-lg"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Coverage & Faults</p>
              <h3 className="text-xl font-semibold mt-1">Coverage Trajectory</h3>
            </div>
            <div className="flex items-center text-sm text-muted-foreground gap-2">
              <Radio className="h-4 w-4 text-teal-500" />
              Live link
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={coverageTrend}>
              <defs>
                <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1f2937" }} />
              <Area type="monotone" dataKey="coverage" stroke="#14b8a6" fill="url(#coverageGradient)" strokeWidth={2} />
              <Line type="monotone" dataKey="faults" stroke="#f97316" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="bg-card border border-border rounded-3xl p-6 shadow-lg"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Energy Orchestration</p>
              <h3 className="text-xl font-semibold mt-1">Dock Throughput</h3>
            </div>
            <Zap className="h-5 w-5 text-amber-400" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={energyProfile}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.08} />
              <XAxis dataKey="label" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1f2937" }} />
              <Bar dataKey="throughput" fill="#0ea5e9" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          className="bg-card border border-border rounded-3xl p-6 shadow-lg flex flex-col"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Command Uptake</p>
              <h3 className="text-xl font-semibold mt-1">Mission Queue</h3>
            </div>
            <Compass className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="space-y-4">
            {missionTimeline.map((mission) => (
              <div key={mission.id} className="border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{mission.id} · {mission.owner}</p>
                    <p className="text-lg font-semibold">{mission.title}</p>
                  </div>
                  <p className="text-sm font-medium text-emerald-500">{mission.eta} ETA</p>
                </div>
                <div className="mt-4">
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                      style={{ width: `${mission.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{mission.progress}% complete</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.div
          className="bg-card border border-border rounded-3xl p-6 shadow-lg"
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Signal Cohesion</p>
              <h3 className="text-xl font-semibold mt-1">Link Integrity</h3>
            </div>
            <Globe className="h-5 w-5 text-sky-400" />
          </div>
          <div className="space-y-4">
            {signalQuality.map((signal) => (
              <div key={signal.rover} className="border border-border rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold">{signal.rover}</p>
                    <p className="text-xs text-muted-foreground">{signal.region}</p>
                  </div>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-indigo-500"
                    style={{ width: `${signal.signal}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{signal.signal}% signal fidelity</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="bg-card border border-border rounded-3xl p-6 shadow-lg"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Live Events</p>
              <h3 className="text-xl font-semibold mt-1">Anomaly Feed</h3>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-3">
            {missionFeed.map((entry) => (
              <motion.div
                key={entry.id}
                className="p-4 border border-border rounded-2xl flex items-start gap-3"
                whileHover={{ scale: 1.02, borderColor: "rgba(45,212,191,0.4)" }}
              >
                <div className={`text-xs font-semibold px-2 py-1 rounded-full ${severityBadge[entry.severity as keyof typeof severityBadge]}`}>
                  {entry.severity}
                </div>
                <div>
                  <p className="font-medium">{entry.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{entry.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="bg-card border border-border rounded-3xl p-6 shadow-lg flex flex-col"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-wider text-muted-foreground">Telemetry Stream</p>
              <h3 className="text-xl font-semibold mt-1">Vital Signs</h3>
            </div>
            <Satellite className="h-5 w-5 text-emerald-400" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={coverageTrend}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
              <XAxis dataKey="time" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ background: "#0f172a", borderRadius: 12, border: "1px solid #1f2937" }} />
              <Line type="monotone" dataKey="coverage" stroke="#22d3ee" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Battery Avg</p>
              <p className="text-lg font-semibold">78%</p>
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="text-xs text-muted-foreground">CPU Load</p>
              <p className="text-lg font-semibold">43%</p>
            </div>
            <div className="rounded-2xl border border-border p-3">
              <p className="text-xs text-muted-foreground">Thermal Delta</p>
              <p className="text-lg font-semibold">+3.2°C</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default MissionControlDashboard;


