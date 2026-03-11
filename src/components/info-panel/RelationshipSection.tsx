"use client";

import { memo, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatContextButton } from "./ChatContextButton";
import { NodeTypeIcon } from "@/components/explore/NodeTypeIcon";
import { useChatStore } from "@/lib/store/chat-store";
import { useInfoPanelStore } from "@/lib/store/info-panel-store";
import type { ADNodeKind, RelationshipSectionDef, RelatedEntity } from "@/types";

interface RelationshipSectionProps {
  objectId: string;
  kind: ADNodeKind;
  section: RelationshipSectionDef;
  count?: number;
}

const PAGE_SIZE = 10;

function RelationshipSectionComponent({
  objectId,
  kind,
  section,
  count,
}: RelationshipSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [items, setItems] = useState<RelatedEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [fetched, setFetched] = useState(false);

  const { addContextChip } = useChatStore();
  const { setSelectedEntity } = useInfoPanelStore();

  const fetchItems = useCallback(
    async (currentSkip: number) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          objectId,
          kind,
          section: section.key,
          skip: String(currentSkip),
          limit: String(PAGE_SIZE),
        });
        const res = await fetch(`/api/entity/related?${params}`);
        if (!res.ok) throw new Error("Failed to fetch related entities");
        const data = await res.json();
        const newItems: RelatedEntity[] = data.items ?? [];

        setItems((prev) =>
          currentSkip === 0 ? newItems : [...prev, ...newItems]
        );
        setHasMore(newItems.length === PAGE_SIZE);
        setSkip(currentSkip + newItems.length);
      } catch (err) {
        console.error("RelationshipSection fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [objectId, kind, section.key]
  );

  const handleToggle = useCallback(() => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next && !fetched) {
      setFetched(true);
      fetchItems(0);
    }
  }, [isExpanded, fetched, fetchItems]);

  const handleLoadMore = useCallback(() => {
    fetchItems(skip);
  }, [fetchItems, skip]);

  const handleEntityClick = useCallback(
    (entity: RelatedEntity) => {
      addContextChip({
        objectId: entity.objectId,
        label: entity.label,
        kind: entity.kind,
      });
      setSelectedEntity({
        objectId: entity.objectId,
        kind: entity.kind,
        label: entity.label,
      });
    },
    [addContextChip, setSelectedEntity]
  );

  const displayCount = count ?? items.length;

  return (
    <div className="border-b border-zinc-700/50">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            {section.label}
          </span>
          <span
            className={cn(
              "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
              displayCount > 0
                ? "bg-cyan-500/20 text-cyan-400"
                : "bg-zinc-700/50 text-zinc-500"
            )}
          >
            {displayCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <ChatContextButton
              onClick={() =>
                addContextChip({
                  objectId,
                  label: `${section.label}: ${items.map((i) => i.label).join(", ")}`,
                  kind,
                })
              }
              tooltip={`Add ${section.label} to chat context`}
            />
          )}
          {isExpanded ? (
            <ChevronUp size={14} className="text-zinc-500" />
          ) : (
            <ChevronDown size={14} className="text-zinc-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-2 pb-2">
          {isLoading && items.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={16} className="text-zinc-500 animate-spin" />
            </div>
          ) : items.length === 0 && fetched ? (
            <div className="text-xs text-zinc-500 py-3 px-2 text-center">
              None found
            </div>
          ) : (
            <>
              <div className="space-y-0.5">
                {items.map((entity) => (
                  <button
                    key={entity.objectId}
                    onClick={() => handleEntityClick(entity)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800/80 transition-colors text-left group"
                  >
                    <NodeTypeIcon kind={entity.kind} size={14} />
                    <span className="text-[11px] text-zinc-200 truncate flex-1">
                      {entity.label}
                    </span>
                    <span className="text-[10px] text-zinc-600 uppercase tracking-wider flex-shrink-0">
                      {entity.kind}
                    </span>
                  </button>
                ))}
              </div>

              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={isLoading}
                  className="w-full mt-2 py-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {isLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  Load more
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const RelationshipSection = memo(RelationshipSectionComponent);
