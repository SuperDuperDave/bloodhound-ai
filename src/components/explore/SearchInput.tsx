"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import { useNodeSearch } from "@/lib/explore/use-node-search";
import { SearchResultItem } from "./SearchResultItem";
import { NodeTypeIcon } from "./NodeTypeIcon";
import type { ADNodeKind, BHSearchResult, SelectedNode } from "@/types";

interface SearchInputProps {
  placeholder?: string;
  onSelect: (node: SelectedNode) => void;
  selectedNode?: SelectedNode | null;
  onClear?: () => void;
  autoFocus?: boolean;
}

export function SearchInput({
  placeholder = "Search nodes...",
  onSelect,
  selectedNode,
  onClear,
  autoFocus = false,
}: SearchInputProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { results, isLoading, search, clear } = useNodeSearch();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as globalThis.Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as globalThis.Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      setHighlightedIndex(-1);
      if (value.trim()) {
        search(value);
        setIsOpen(true);
      } else {
        clear();
        setIsOpen(false);
      }
    },
    [search, clear]
  );

  const handleSelect = useCallback(
    (result: BHSearchResult) => {
      const kind = (result.type || "Base") as ADNodeKind;
      onSelect({
        objectId: result.objectid,
        label: result.name,
        kind,
      });
      setQuery("");
      setIsOpen(false);
      clear();
    },
    [onSelect, clear]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setIsOpen(false);
    clear();
    onClear?.();
    inputRef.current?.focus();
  }, [clear, onClear]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || results.length === 0) {
        if (e.key === "Escape") {
          setIsOpen(false);
          inputRef.current?.blur();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((i) => Math.min(i + 1, results.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < results.length) {
            handleSelect(results[highlightedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    },
    [isOpen, results, highlightedIndex, handleSelect]
  );

  // If a node is selected, show it as a chip
  if (selectedNode) {
    return (
      <div className="flex items-center gap-2 bg-zinc-800/50 border border-zinc-700 rounded-md px-2.5 py-1.5 min-h-[36px]">
        <NodeTypeIcon kind={selectedNode.kind} size={14} />
        <span className="text-[13px] text-zinc-100 truncate flex-1">
          {selectedNode.label}
        </span>
        <button
          onClick={handleClear}
          className="text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim() && results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-zinc-800/50 border border-zinc-700 rounded-md pl-8 pr-3 py-1.5 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-cyan-600/50 focus:ring-1 focus:ring-cyan-600/30 transition-colors"
        />
        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl overflow-hidden z-50 max-h-[280px] overflow-y-auto"
        >
          {results.map((result, index) => (
            <SearchResultItem
              key={result.objectid}
              result={result}
              query={query}
              isHighlighted={index === highlightedIndex}
              onClick={() => handleSelect(result)}
            />
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && !isLoading && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-md shadow-xl p-3">
          <p className="text-[12px] text-zinc-500 text-center">No results found</p>
        </div>
      )}
    </div>
  );
}
