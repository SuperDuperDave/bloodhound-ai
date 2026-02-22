"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ADNodeData } from "@/types";
import { cn } from "@/lib/utils";
import { useGraphStore } from "@/lib/store/graph-store";

const kindConfig: Record<
  string,
  { icon: string; color: string; borderColor: string }
> = {
  User: { icon: "👤", color: "bg-blue-500/20", borderColor: "border-blue-500/50" },
  Computer: { icon: "🖥️", color: "bg-green-500/20", borderColor: "border-green-500/50" },
  Group: { icon: "👥", color: "bg-yellow-500/20", borderColor: "border-yellow-500/50" },
  Domain: { icon: "🏰", color: "bg-purple-500/20", borderColor: "border-purple-500/50" },
  OU: { icon: "📁", color: "bg-orange-500/20", borderColor: "border-orange-500/50" },
  GPO: { icon: "📋", color: "bg-teal-500/20", borderColor: "border-teal-500/50" },
  Container: { icon: "📦", color: "bg-gray-500/20", borderColor: "border-gray-500/50" },
};

function ADNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as ADNodeData;
  const { highlightedNodeIds, selectedNodeId } = useGraphStore();
  const isHighlighted = highlightedNodeIds.has(nodeData.objectId);
  const isSelected = selectedNodeId === nodeData.objectId;
  const config = kindConfig[nodeData.kind] || kindConfig.Container;

  const truncatedLabel =
    nodeData.label.length > 28
      ? nodeData.label.substring(0, 25) + "..."
      : nodeData.label;

  return (
    <>
      <Handle type="target" position={Position.Left} className="!bg-zinc-500 !w-2 !h-2 !border-0" />
      <div
        className={cn(
          "px-3 py-2 rounded-lg border min-w-[160px] max-w-[220px] transition-all duration-300",
          config.color,
          config.borderColor,
          isSelected && "ring-2 ring-cyan-400 border-cyan-400",
          isHighlighted && "ring-2 ring-red-500 border-red-500 animate-pulse shadow-lg shadow-red-500/20"
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-base flex-shrink-0">{config.icon}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
              {nodeData.kind}
            </div>
            <div className="text-xs font-semibold text-zinc-100 truncate" title={nodeData.label}>
              {truncatedLabel}
            </div>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="!bg-zinc-500 !w-2 !h-2 !border-0" />
    </>
  );
}

export const ADNode = memo(ADNodeComponent);
