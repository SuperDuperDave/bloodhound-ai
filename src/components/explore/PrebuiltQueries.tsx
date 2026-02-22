"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, BookOpen, Search } from "lucide-react";
import { PREBUILT_QUERY_CATEGORIES } from "@/lib/explore/prebuilt-queries";
import type { QueryCategory, PrebuiltQuery } from "@/types";

interface PrebuiltQueriesProps {
  onSelectQuery: (query: string) => void;
}

const platformColors: Record<string, { bg: string; text: string; label: string }> = {
  ad: { bg: "bg-blue-500/15", text: "text-blue-400", label: "AD" },
  azure: { bg: "bg-cyan-500/15", text: "text-cyan-400", label: "Azure" },
  cross: { bg: "bg-purple-500/15", text: "text-purple-400", label: "Cross" },
};

function PlatformBadge({ platform }: { platform: string }) {
  const style = platformColors[platform] ?? platformColors.ad;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function CategorySection({
  category,
  searchFilter,
  onSelectQuery,
}: {
  category: QueryCategory;
  searchFilter: string;
  onSelectQuery: (query: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const matchingQueries = useMemo(() => {
    if (!searchFilter) return category.queries;
    const lower = searchFilter.toLowerCase();
    return category.queries.filter(
      (q) =>
        q.name.toLowerCase().includes(lower) ||
        q.description.toLowerCase().includes(lower)
    );
  }, [category.queries, searchFilter]);

  // Auto-expand when filter matches
  const isExpanded = searchFilter ? matchingQueries.length > 0 : expanded;

  if (searchFilter && matchingQueries.length === 0) return null;

  return (
    <div className="border-b border-zinc-800/50 last:border-b-0">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-zinc-800/30 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={12} className="text-zinc-500 flex-shrink-0" />
        ) : (
          <ChevronRight size={12} className="text-zinc-500 flex-shrink-0" />
        )}
        <span className="text-[12px] font-medium text-zinc-300 flex-1 truncate">
          {category.name}
        </span>
        <PlatformBadge platform={category.platform} />
        <span className="text-[10px] text-zinc-600">
          {matchingQueries.length}
        </span>
      </button>

      {isExpanded && (
        <div className="pb-1">
          {matchingQueries.map((query) => (
            <QueryItem key={query.id} query={query} onSelect={onSelectQuery} />
          ))}
        </div>
      )}
    </div>
  );
}

function QueryItem({
  query,
  onSelect,
}: {
  query: PrebuiltQuery;
  onSelect: (query: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(query.query)}
      className="w-full text-left px-3 pl-7 py-1.5 hover:bg-zinc-800/50 transition-colors group"
    >
      <div className="text-[11px] font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
        {query.name}
      </div>
      <div className="text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors leading-tight">
        {query.description}
      </div>
    </button>
  );
}

export function PrebuiltQueries({ onSelectQuery }: PrebuiltQueriesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  return (
    <div className="border-b border-zinc-800">
      {/* Header toggle */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-800/30 transition-colors"
      >
        <BookOpen size={13} className="text-zinc-500 flex-shrink-0" />
        <span className="text-[12px] font-medium text-zinc-400 flex-1 text-left">
          Saved Queries
        </span>
        {isOpen ? (
          <ChevronDown size={13} className="text-zinc-500" />
        ) : (
          <ChevronRight size={13} className="text-zinc-500" />
        )}
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div>
          {/* Search/filter */}
          <div className="px-3 pb-2">
            <div className="relative">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter queries..."
                className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-md pl-7 pr-3 py-1.5 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="max-h-[300px] overflow-y-auto">
            {PREBUILT_QUERY_CATEGORIES.map((cat) => (
              <CategorySection
                key={cat.id}
                category={cat}
                searchFilter={searchFilter}
                onSelectQuery={onSelectQuery}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
