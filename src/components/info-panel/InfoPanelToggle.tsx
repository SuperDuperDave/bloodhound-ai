"use client";

import { memo } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInfoPanelStore } from "@/lib/store/info-panel-store";

function InfoPanelToggleComponent() {
  const { isOpen, selectedEntity, selectedEdge, togglePanel } =
    useInfoPanelStore();

  const hasSelection = selectedEntity || selectedEdge;

  if (isOpen) return null;

  return (
    <button
      onClick={togglePanel}
      className={cn(
        "absolute top-3 right-3 z-20",
        "w-10 h-10 rounded-full flex items-center justify-center",
        "bg-zinc-800/90 border border-zinc-700 shadow-lg",
        "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700",
        "transition-all duration-200"
      )}
      title={hasSelection ? "Show info panel" : "Info panel"}
    >
      <Info size={18} />
      {/* Selection indicator dot */}
      {hasSelection && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border-2 border-zinc-800" />
      )}
    </button>
  );
}

export const InfoPanelToggle = memo(InfoPanelToggleComponent);
