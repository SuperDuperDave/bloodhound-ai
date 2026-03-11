"use client";

import { memo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatContextButton } from "./ChatContextButton";
import { useChatStore } from "@/lib/store/chat-store";
import { getEdgeHelpText } from "@/lib/info-panel/edges";
import type { SelectedEdge } from "@/types";

interface EdgeInfoPanelProps {
  edge: SelectedEdge;
}

type TabKey = "general" | "abuse" | "opsec" | "references";

const TABS: { key: TabKey; label: string }[] = [
  { key: "general", label: "General" },
  { key: "abuse", label: "Abuse" },
  { key: "opsec", label: "OPSEC" },
  { key: "references", label: "References" },
];

function EdgeInfoPanelComponent({ edge }: EdgeInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const { addContextChip } = useChatStore();
  const helpText = getEdgeHelpText(edge.kind);

  if (!helpText) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-zinc-500">
          No detailed information available for this edge type.
        </p>
        <p className="text-[10px] text-zinc-600 mt-1">
          Edge: {edge.kind}
        </p>
      </div>
    );
  }

  const getTabContent = (tab: TabKey): string | null => {
    switch (tab) {
      case "general":
        return helpText.general;
      case "opsec":
        return helpText.opsec;
      default:
        return null;
    }
  };

  const tabContent = getTabContent(activeTab);

  return (
    <div>
      {/* Tab Bar */}
      <div className="flex border-b border-zinc-700/50">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 py-2 text-[11px] font-medium transition-colors relative",
              activeTab === tab.key
                ? "text-cyan-400"
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-px bg-cyan-400" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === "general" && tabContent && (
          <div className="relative group">
            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChatContextButton
                onClick={() =>
                  addContextChip({
                    objectId: `edge-${edge.sourceId}-${edge.targetId}`,
                    label: `${edge.kind}: ${helpText.general.slice(0, 100)}...`,
                    kind: "Base",
                  })
                }
                tooltip="Add to chat context"
              />
            </div>
            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {tabContent}
            </p>
          </div>
        )}

        {activeTab === "abuse" && (
          <div className="space-y-4">
            {helpText.windowsAbuse && (
              <div className="relative group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
                    Windows
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChatContextButton
                      onClick={() =>
                        addContextChip({
                          objectId: `edge-${edge.sourceId}-${edge.targetId}-win`,
                          label: `${edge.kind} Windows Abuse: ${helpText.windowsAbuse!.slice(0, 80)}...`,
                          kind: "Base",
                        })
                      }
                      tooltip="Add Windows abuse to chat"
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {helpText.windowsAbuse}
                </p>
              </div>
            )}

            {helpText.linuxAbuse && (
              <div className="relative group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 font-medium">
                    Linux
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChatContextButton
                      onClick={() =>
                        addContextChip({
                          objectId: `edge-${edge.sourceId}-${edge.targetId}-linux`,
                          label: `${edge.kind} Linux Abuse: ${helpText.linuxAbuse!.slice(0, 80)}...`,
                          kind: "Base",
                        })
                      }
                      tooltip="Add Linux abuse to chat"
                    />
                  </div>
                </div>
                <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {helpText.linuxAbuse}
                </p>
              </div>
            )}

            {helpText.abuse && !helpText.windowsAbuse && !helpText.linuxAbuse && (
              <div className="relative group">
                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChatContextButton
                    onClick={() =>
                      addContextChip({
                        objectId: `edge-${edge.sourceId}-${edge.targetId}-abuse`,
                        label: `${edge.kind} Abuse: ${helpText.abuse!.slice(0, 80)}...`,
                        kind: "Base",
                      })
                    }
                    tooltip="Add abuse info to chat"
                  />
                </div>
                <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {helpText.abuse}
                </p>
              </div>
            )}

            {!helpText.windowsAbuse && !helpText.linuxAbuse && !helpText.abuse && (
              <p className="text-xs text-zinc-500">
                No abuse information available.
              </p>
            )}
          </div>
        )}

        {activeTab === "opsec" && tabContent && (
          <div className="relative group">
            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChatContextButton
                onClick={() =>
                  addContextChip({
                    objectId: `edge-${edge.sourceId}-${edge.targetId}-opsec`,
                    label: `${edge.kind} OPSEC: ${helpText.opsec.slice(0, 80)}...`,
                    kind: "Base",
                  })
                }
                tooltip="Add OPSEC info to chat"
              />
            </div>
            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {tabContent}
            </p>
          </div>
        )}

        {activeTab === "references" && (
          <div className="space-y-1.5">
            {helpText.references.length > 0 ? (
              helpText.references.map((ref, i) => (
                <a
                  key={i}
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800/80 transition-colors group"
                >
                  <ExternalLink
                    size={12}
                    className="text-zinc-600 group-hover:text-cyan-400 flex-shrink-0 transition-colors"
                  />
                  <span className="text-[11px] text-zinc-300 group-hover:text-cyan-300 truncate transition-colors">
                    {ref.title}
                  </span>
                </a>
              ))
            ) : (
              <p className="text-xs text-zinc-500">No references available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const EdgeInfoPanel = memo(EdgeInfoPanelComponent);
