"use client";

import { useState, useRef, useCallback } from "react";
import type { BHSearchResult } from "@/types";

interface UseNodeSearchOptions {
  debounceMs?: number;
  limit?: number;
}

export function useNodeSearch(options: UseNodeSearchOptions = {}) {
  const { debounceMs = 300, limit = 10 } = options;
  const [results, setResults] = useState<BHSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, BHSearchResult[]>>(new Map());

  const search = useCallback(
    (rawQuery: string) => {
      // Clear previous timer
      if (timerRef.current) clearTimeout(timerRef.current);
      // Abort in-flight request
      if (abortRef.current) abortRef.current.abort();

      const trimmed = rawQuery.trim();
      if (!trimmed) {
        setResults([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Parse type-scoped search: "group:admin" → type=Group, query=admin
      let typeFilter: string | undefined;
      let query = trimmed;
      const typeMatch = trimmed.match(/^(user|computer|group|domain|ou|gpo):(.+)/i);
      if (typeMatch) {
        typeFilter = typeMatch[1].charAt(0).toUpperCase() + typeMatch[1].slice(1).toLowerCase();
        query = typeMatch[2].trim();
      }

      // Check cache
      const cacheKey = `${typeFilter || ""}:${query}`;
      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setResults(cached);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      timerRef.current = setTimeout(async () => {
        const controller = new AbortController();
        abortRef.current = controller;

        try {
          const params = new URLSearchParams({ q: query, limit: String(limit) });
          if (typeFilter) params.set("type", typeFilter);

          const res = await fetch(`/api/search?${params}`, {
            signal: controller.signal,
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Search failed: ${res.status}`);
          }

          const data = await res.json();
          const items: BHSearchResult[] = data.data || [];

          // Cache result (LRU, max 50)
          if (cacheRef.current.size >= 50) {
            const firstKey = cacheRef.current.keys().next().value;
            if (firstKey !== undefined) cacheRef.current.delete(firstKey);
          }
          cacheRef.current.set(cacheKey, items);

          setResults(items);
          setError(null);
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Search failed");
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs, limit]
  );

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    setResults([]);
    setIsLoading(false);
    setError(null);
  }, []);

  return { results, isLoading, error, search, clear };
}
