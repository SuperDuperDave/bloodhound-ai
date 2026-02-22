"use client";

import { useChatStore } from "@/lib/store/chat-store";

const severityColors = {
  critical: "border-red-500/50 bg-red-500/10 text-red-300",
  high: "border-orange-500/50 bg-orange-500/10 text-orange-300",
  medium: "border-yellow-500/50 bg-yellow-500/10 text-yellow-300",
  low: "border-blue-500/50 bg-blue-500/10 text-blue-300",
};

const severityBadge = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export function RemediationPanel() {
  const { remediationItems, removeRemediationItem } = useChatStore();

  if (remediationItems.length === 0) return null;

  return (
    <div className="border-t border-zinc-800 bg-zinc-900/80">
      <div className="px-4 py-2 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">🛡️</span>
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Remediation Plan
          </h3>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-300">
            {remediationItems.length}
          </span>
        </div>
      </div>
      <div className="max-h-[200px] overflow-y-auto p-2 space-y-2">
        {remediationItems.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border p-2.5 ${severityColors[item.severity]}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border flex-shrink-0 ${
                    severityBadge[item.severity]
                  }`}
                >
                  {item.severity}
                </span>
                <span className="text-xs font-semibold truncate">{item.title}</span>
              </div>
              <button
                onClick={() => removeRemediationItem(item.id)}
                className="text-zinc-500 hover:text-zinc-300 text-xs flex-shrink-0"
              >
                ×
              </button>
            </div>
            <p className="text-[11px] mt-1.5 opacity-80 leading-relaxed">
              {item.description}
            </p>
            <div className="mt-1.5 text-[11px] opacity-90">
              <span className="font-semibold">Fix: </span>
              {item.recommendation}
            </div>
            {item.affectedObjects && item.affectedObjects.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {item.affectedObjects.map((obj) => (
                  <span
                    key={obj}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 font-mono"
                  >
                    {obj}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
