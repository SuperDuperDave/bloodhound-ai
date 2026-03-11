"use client";

import { memo, useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { ObjectInfoSection } from "./ObjectInfoSection";
import { RelationshipSection } from "./RelationshipSection";
import { getSectionsForKind } from "@/lib/info-panel/entity-sections";
import type { ADNodeKind, EntityInfo } from "@/types";

interface NodeInfoPanelProps {
  entity: { objectId: string; kind: ADNodeKind; label: string };
}

function NodeInfoPanelComponent({ entity }: NodeInfoPanelProps) {
  const [data, setData] = useState<EntityInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEntity() {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          objectId: entity.objectId,
          kind: entity.kind,
        });
        const res = await fetch(`/api/entity?${params}`);
        if (!res.ok) throw new Error("Failed to fetch entity details");
        const json = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchEntity();
    return () => {
      cancelled = true;
    };
  }, [entity.objectId, entity.kind]);

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 bg-zinc-800 rounded animate-pulse w-24" />
            <div className="h-3 bg-zinc-800/60 rounded animate-pulse w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-red-400 mb-2">{error}</p>
        <button
          onClick={() => {
            setIsLoading(true);
            setError(null);
            const params = new URLSearchParams({
              objectId: entity.objectId,
              kind: entity.kind,
            });
            fetch(`/api/entity?${params}`)
              .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch");
                return res.json();
              })
              .then(setData)
              .catch((err) =>
                setError(err instanceof Error ? err.message : "Unknown error")
              )
              .finally(() => setIsLoading(false));
          }}
          className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const sections = getSectionsForKind(entity.kind);

  return (
    <div>
      {/* Object Properties */}
      <ObjectInfoSection
        properties={data.properties}
        kind={entity.kind}
        objectId={entity.objectId}
        label={entity.label}
      />

      {/* Relationship Sections */}
      {sections.map((section) => (
        <RelationshipSection
          key={section.key}
          objectId={entity.objectId}
          kind={entity.kind}
          section={section}
          count={data.counts?.[section.key]}
        />
      ))}
    </div>
  );
}

export const NodeInfoPanel = memo(NodeInfoPanelComponent);
