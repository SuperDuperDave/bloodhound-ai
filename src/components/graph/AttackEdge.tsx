"use client";

import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { ADEdgeData } from "@/types";
import { useGraphStore } from "@/lib/store/graph-store";
import { cn } from "@/lib/utils";

function AttackEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as unknown as ADEdgeData | undefined;
  const { highlightedEdgeIds } = useGraphStore();
  const isHighlighted = highlightedEdgeIds.has(id);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={cn(
          "transition-all duration-300",
          isHighlighted ? "!stroke-red-500 !stroke-[3]" : "!stroke-zinc-600 !stroke-[1.5]"
        )}
        style={
          isHighlighted
            ? {
                strokeDasharray: "8 4",
                animation: "dash 0.5s linear infinite",
              }
            : undefined
        }
      />
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "absolute text-[9px] font-mono px-1.5 py-0.5 rounded pointer-events-none",
              isHighlighted
                ? "bg-red-500/90 text-white font-bold"
                : "bg-zinc-800/90 text-zinc-400"
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const AttackEdge = memo(AttackEdgeComponent);
