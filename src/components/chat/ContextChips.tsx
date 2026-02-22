"use client";

import { useChatStore } from "@/lib/store/chat-store";

const kindColors: Record<string, string> = {
  User: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Computer: "bg-green-500/20 text-green-300 border-green-500/30",
  Group: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Domain: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  OU: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

export function ContextChips() {
  const { contextChips, removeContextChip } = useChatStore();

  if (contextChips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-zinc-800">
      <span className="text-[10px] uppercase tracking-wider text-zinc-500 self-center mr-1">
        Context:
      </span>
      {contextChips.map((chip) => (
        <button
          key={chip.objectId}
          onClick={() => removeContextChip(chip.objectId)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors hover:opacity-80 ${
            kindColors[chip.kind] || "bg-zinc-700/50 text-zinc-300 border-zinc-600"
          }`}
        >
          <span className="max-w-[120px] truncate">{chip.label}</span>
          <span className="text-zinc-500 hover:text-zinc-300 ml-0.5">×</span>
        </button>
      ))}
    </div>
  );
}
