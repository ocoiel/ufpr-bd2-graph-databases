"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import type { SearchHit } from "@/lib/types";
import { KIND_COLOR, KIND_LABEL_PT, cn } from "@/lib/utils";

interface Props {
  onSelect: (hit: SearchHit) => void;
  selectedId?: string;
}

export default function SearchPanel({ onSelect, selectedId }: Props) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      setElapsed(null);
      return;
    }
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(q)}&limit=40`,
          { signal: ctrl.signal },
        );
        const data = await res.json();
        setHits(data.hits ?? []);
        setElapsed(data.elapsedMs ?? null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar pessoa, empresa ou intermediário…"
          className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800
                     text-sm text-zinc-100 placeholder:text-zinc-500
                     focus:outline-none focus:ring-1 focus:ring-amber-500/40 focus:border-amber-500/40
                     transition"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500 animate-spin" />
        )}
      </div>

      {elapsed !== null && hits.length > 0 && (
        <div className="text-[11px] text-zinc-500 font-mono tabular-nums px-1">
          {hits.length} resultado{hits.length === 1 ? "" : "s"} · {elapsed}ms
        </div>
      )}

      <ul className="flex flex-col gap-1 -mx-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {hits.map((hit) => (
          <li key={`${hit.kind}-${hit.id}`}>
            <button
              onClick={() => onSelect(hit)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md flex items-center gap-2.5 group transition",
                selectedId === hit.id
                  ? "bg-zinc-800/80 ring-1 ring-amber-500/30"
                  : "hover:bg-zinc-900",
              )}
            >
              <span
                className="size-2.5 rounded-full shrink-0"
                style={{ background: KIND_COLOR[hit.kind] }}
                aria-hidden
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-zinc-100 truncate">
                  {hit.name}
                </span>
                <span className="block text-[11px] text-zinc-500 truncate">
                  {KIND_LABEL_PT[hit.kind]}
                  {hit.country ? ` · ${hit.country}` : ""}
                  {hit.jurisdiction ? ` · ${hit.jurisdiction}` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
        {!loading && q.trim().length >= 2 && hits.length === 0 && (
          <li className="text-xs text-zinc-500 px-3 py-4 text-center">
            Nenhum resultado.
          </li>
        )}
      </ul>
    </div>
  );
}
