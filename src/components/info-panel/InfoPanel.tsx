"use client";

import { memo } from "react";
import { X, Shield, Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInfoPanelStore } from "@/lib/store/info-panel-store";
import { NodeInfoPanel } from "./NodeInfoPanel";
import { EdgeInfoPanel } from "./EdgeInfoPanel";
import { NodeTypeIcon } from "@/components/explore/NodeTypeIcon";
import type { ADNodeKind } from "@/types";

const kindConfig: Record<
  string,
  { icon: string; color: string; borderColor: string }
> = {
  User: { icon: "\u{1F464}", color: "bg-blue-500/20", borderColor: "border-blue-500/50" },
  Computer: { icon: "\u{1F5A5}\uFE0F", color: "bg-green-500/20", borderColor: "border-green-500/50" },
  Group: { icon: "\u{1F465}", color: "bg-yellow-500/20", borderColor: "border-yellow-500/50" },
  Domain: { icon: "\u{1F3F0}", color: "bg-purple-500/20", borderColor: "border-purple-500/50" },
  OU: { icon: "\u{1F4C1}", color: "bg-orange-500/20", borderColor: "border-orange-500/50" },
  GPO: { icon: "\u{1F4CB}", color: "bg-teal-500/20", borderColor: "border-teal-500/50" },
  Container: { icon: "\u{1F4E6}", color: "bg-gray-500/20", borderColor: "border-gray-500/50" },
  CertTemplate: { icon: "\u{1F4DC}", color: "bg-pink-500/20", borderColor: "border-pink-500/50" },
  EnterpriseCA: { icon: "\u{1F3DB}\uFE0F", color: "bg-indigo-500/20", borderColor: "border-indigo-500/50" },
  RootCA: { icon: "\u{1F510}", color: "bg-red-500/20", borderColor: "border-red-500/50" },
  AIACA: { icon: "\u{1F511}", color: "bg-amber-500/20", borderColor: "border-amber-500/50" },
  NTAuthStore: { icon: "\u{1F5C4}\uFE0F", color: "bg-slate-500/20", borderColor: "border-slate-500/50" },
};

function getKindConfig(kind: ADNodeKind | string) {
  return kindConfig[kind] || { icon: "\u{1F4E6}", color: "bg-gray-500/20", borderColor: "border-gray-500/50" };
}

function InfoPanelComponent() {
  const { isOpen, selectedEntity, selectedEdge, closePanel } =
    useInfoPanelStore();

  const hasContent = selectedEntity || selectedEdge;

  return (
    <div
      className={cn(
        "absolute right-0 top-0 bottom-0 w-[420px] z-30",
        "bg-zinc-900/95 backdrop-blur-sm border-l border-zinc-700/50 shadow-2xl",
        "transition-transform duration-300 ease-in-out",
        "flex flex-col",
        isOpen && hasContent ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      {selectedEntity && (
        <div className="flex-shrink-0 border-b border-zinc-700/50 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Kind icon */}
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                  getKindConfig(selectedEntity.kind).color,
                  getKindConfig(selectedEntity.kind).borderColor
                )}
              >
                <span className="text-sm">
                  {getKindConfig(selectedEntity.kind).icon}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-zinc-100 truncate">
                  {selectedEntity.label}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                    {selectedEntity.kind}
                  </span>
                  {"isTierZero" in selectedEntity &&
                    (selectedEntity as { isTierZero?: boolean }).isTierZero && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                        <Shield size={9} />
                        T0
                      </span>
                    )}
                  {"isOwned" in selectedEntity &&
                    (selectedEntity as { isOwned?: boolean }).isOwned && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 font-medium">
                        <Crosshair size={9} />
                        Owned
                      </span>
                    )}
                </div>
              </div>
            </div>
            <button
              onClick={closePanel}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {selectedEdge && !selectedEntity && (
        <div className="flex-shrink-0 border-b border-zinc-700/50 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-zinc-100">
                {selectedEdge.kind}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px]">
                <span className="text-zinc-400 truncate max-w-[140px]">
                  {selectedEdge.sourceLabel}
                </span>
                <span className="text-cyan-500 flex-shrink-0">&rarr;</span>
                <span className="text-zinc-400 truncate max-w-[140px]">
                  {selectedEdge.targetLabel}
                </span>
              </div>
            </div>
            <button
              onClick={closePanel}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {selectedEntity && (
          <NodeInfoPanel
            entity={{
              objectId: selectedEntity.objectId,
              kind: selectedEntity.kind,
              label: selectedEntity.label,
            }}
          />
        )}
        {selectedEdge && !selectedEntity && (
          <EdgeInfoPanel edge={selectedEdge} />
        )}
      </div>
    </div>
  );
}

export const InfoPanel = memo(InfoPanelComponent);
