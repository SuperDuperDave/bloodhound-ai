import { NodeTypeIcon } from "./NodeTypeIcon";
import type { BHSearchResult } from "@/types";

interface SearchResultItemProps {
  result: BHSearchResult;
  query: string;
  isHighlighted: boolean;
  onClick: () => void;
}

export function SearchResultItem({
  result,
  query,
  isHighlighted,
  onClick,
}: SearchResultItemProps) {
  // Highlight matching text
  const name = result.name;
  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase().replace(/^(user|computer|group|domain|ou|gpo):/, "").trim();
  const matchIndex = lowerName.indexOf(lowerQuery);

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
        isHighlighted ? "bg-zinc-700/80" : "hover:bg-zinc-800/80"
      }`}
    >
      <NodeTypeIcon kind={result.type} size={16} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-zinc-100 truncate">
          {matchIndex >= 0 ? (
            <>
              {name.slice(0, matchIndex)}
              <span className="bg-cyan-500/30 text-cyan-200 rounded-sm px-0.5">
                {name.slice(matchIndex, matchIndex + lowerQuery.length)}
              </span>
              {name.slice(matchIndex + lowerQuery.length)}
            </>
          ) : (
            name
          )}
        </div>
      </div>
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider flex-shrink-0">
        {result.type}
      </span>
    </button>
  );
}
