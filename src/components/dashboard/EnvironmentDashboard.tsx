"use client";

import { useEnvironmentStore } from "@/lib/store/environment-store";

export function EnvironmentDashboard() {
  const { stats, loading, error } = useEnvironmentStore();

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
          Connecting to BloodHound...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-sm text-red-400">
          Connection failed: {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const collectedDomains = stats.domains.filter((d) => d.collected);

  return (
    <div className="p-3 space-y-3">
      {/* Domain Tags */}
      <div className="flex flex-wrap gap-1.5">
        {collectedDomains.map((domain) => (
          <span
            key={domain.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20 text-xs font-medium"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            {domain.name}
          </span>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Users" value={stats.totalUsers} color="blue" />
        <StatCard label="Computers" value={stats.totalComputers} color="green" />
        <StatCard label="Groups" value={stats.totalGroups} color="yellow" />
        <StatCard label="Domains" value={collectedDomains.length} color="purple" />
      </div>

      {/* Risk Indicators */}
      <div className="grid grid-cols-3 gap-2">
        <RiskCard
          label="Kerberoastable"
          value={stats.kerberoastableUsers}
          severity={stats.kerberoastableUsers > 0 ? "high" : "none"}
        />
        <RiskCard
          label="AS-REP Roastable"
          value={stats.asrepRoastableUsers}
          severity={stats.asrepRoastableUsers > 0 ? "high" : "none"}
        />
        <RiskCard
          label="Unconstrained Deleg."
          value={stats.unconstrainedDelegation}
          severity={stats.unconstrainedDelegation > 0 ? "critical" : "none"}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-400",
    green: "text-green-400",
    yellow: "text-yellow-400",
    purple: "text-purple-400",
  };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-2.5 py-2">
      <div className={`text-lg font-bold ${colorMap[color] || "text-zinc-100"}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function RiskCard({
  label,
  value,
  severity,
}: {
  label: string;
  value: number;
  severity: "critical" | "high" | "medium" | "none";
}) {
  const severityColors = {
    critical: "text-red-400 bg-red-500/10 border-red-500/20",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    none: "text-green-400 bg-green-500/10 border-green-500/20",
  };

  return (
    <div
      className={`rounded-lg px-2.5 py-2 border ${severityColors[severity]}`}
    >
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
    </div>
  );
}
