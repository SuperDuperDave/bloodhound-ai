"use client";

import { memo, useState, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatContextButton } from "./ChatContextButton";
import { useChatStore } from "@/lib/store/chat-store";
import {
  formatPropertyValue,
  getPropertyLabel,
  getImportantProperties,
  isSecurityProperty,
} from "@/lib/info-panel/property-display";
import type { ADNodeKind } from "@/types";

interface ObjectInfoSectionProps {
  properties: Record<string, unknown>;
  kind: ADNodeKind;
  objectId: string;
  label: string;
}

function ObjectInfoSectionComponent({
  properties,
  kind,
  objectId,
  label,
}: ObjectInfoSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { addContextChip } = useChatStore();

  const sortedEntries = useMemo(() => {
    const entries = Object.entries(properties);
    const important = new Set(getImportantProperties(kind));

    return entries.sort((a, b) => {
      const aImportant = important.has(a[0]);
      const bImportant = important.has(b[0]);
      if (aImportant && !bImportant) return -1;
      if (!aImportant && bImportant) return 1;
      return a[0].localeCompare(b[0]);
    });
  }, [properties, kind]);

  return (
    <div className="border-b border-zinc-700/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Object Information
          </span>
          <span className="text-[10px] text-zinc-500">
            {sortedEntries.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ChatContextButton
            onClick={() =>
              addContextChip({ objectId, label, kind })
            }
            tooltip="Add entity to chat context"
          />
          {isExpanded ? (
            <ChevronUp size={14} className="text-zinc-500" />
          ) : (
            <ChevronDown size={14} className="text-zinc-500" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3">
          {sortedEntries.length === 0 ? (
            <div className="text-xs text-zinc-500 py-2">
              No properties available
            </div>
          ) : (
            <div className="space-y-0.5">
              {sortedEntries.map(([key, value]) => (
                <PropertyRow
                  key={key}
                  propertyKey={key}
                  value={value}
                  kind={kind}
                  objectId={objectId}
                  label={label}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const PropertyRow = memo(function PropertyRow({
  propertyKey,
  value,
  kind,
  objectId,
  label,
}: {
  propertyKey: string;
  value: unknown;
  kind: ADNodeKind;
  objectId: string;
  label: string;
}) {
  const { addContextChip } = useChatStore();
  const isSecurity = isSecurityProperty(propertyKey);
  const formattedValue = formatPropertyValue(propertyKey, value);
  const displayLabel = getPropertyLabel(propertyKey);
  const isBool = typeof value === "boolean";

  return (
    <div
      className={cn(
        "flex items-start gap-2 py-1.5 px-2 rounded group",
        isSecurity && "bg-red-500/10"
      )}
    >
      <span className="text-[11px] text-zinc-400 min-w-[120px] flex-shrink-0 pt-px">
        {displayLabel}
      </span>
      <span
        className={cn(
          "text-[11px] font-mono flex-1 min-w-0 break-all",
          isBool && value === true && "text-green-400",
          isBool && value === false && "text-zinc-500",
          !isBool && "text-zinc-100"
        )}
      >
        {isBool ? (
          <span
            className={cn(
              "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium",
              value
                ? "bg-green-500/20 text-green-400"
                : "bg-zinc-700/50 text-zinc-500"
            )}
          >
            {value ? "True" : "False"}
          </span>
        ) : (
          formattedValue
        )}
      </span>
      <ChatContextButton
        onClick={() =>
          addContextChip({
            objectId,
            label: `${label} - ${displayLabel}: ${formattedValue}`,
            kind,
          })
        }
        tooltip={`Add "${displayLabel}" to chat context`}
        className="opacity-0 group-hover:opacity-100"
      />
    </div>
  );
});

export const ObjectInfoSection = memo(ObjectInfoSectionComponent);
