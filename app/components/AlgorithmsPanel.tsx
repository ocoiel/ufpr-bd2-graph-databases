"use client";

import { useState } from "react";
import { Crown, Network, Route, Loader2 } from "lucide-react";
import { KIND_COLOR } from "@/lib/utils";
import type { NodeKind } from "@/lib/types";

interface Props {
  rootId: string | null;
  onPickNode: (id: string) => void;
  onShowPath: (sourceId: string, targetId: string) => void;
  onCommunityResult: (map: Record<string, number>) => void;
  onResetView: () => void;
  onCypher: (cypher: string, elapsed?: number) => void;
}

type Row = { id: string; name: string; kind: NodeKind; score?: number; community?: number };

export default function AlgorithmsPanel({
  rootId,
  onPickNode,
  onShowPath,
  onCommunityResult,
  onResetView,
  onCypher,
}: Props) {
  const [busy, setBusy] = useState<"pagerank" | "louvain" | "path" | null>(null);
  const [pagerank, setPagerank] = useState<Row[]>([]);
  const [louvain, setLouvain] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState("");

  const disabled = !rootId;

  async function runPageRank() {
    if (!rootId) return;
    setBusy("pagerank");
    setError(null);
    try {
      const res = await fetch(`/api/algorithm/pagerank?rootId=${rootId}&hops=2&limit=25`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPagerank(data.rows ?? []);
      setLouvain([]);
      onCypher(data.cypher, data.elapsedMs);
      onResetView();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runLouvain() {
    if (!rootId) return;
    setBusy("louvain");
    setError(null);
    try {
      const res = await fetch(`/api/algorithm/louvain?rootId=${rootId}&hops=2`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const rows = (data.rows ?? []) as Row[];
      setLouvain(rows);
      setPagerank([]);
      const map: Record<string, number> = {};
      for (const r of rows) if (r.community !== undefined) map[r.id] = r.community;
      onCommunityResult(map);
      onCypher(data.cypher, data.elapsedMs);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function runPath() {
    if (!rootId || !pathTarget) return;
    setBusy("path");
    setError(null);
    try {
      onShowPath(rootId, pathTarget);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
        Algoritmos de grafo (GDS)
      </div>

      <button
        disabled={disabled || busy !== null}
        onClick={runPageRank}
        className="group flex items-start gap-3 px-3 py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800
                   border border-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Crown className="size-4 mt-0.5 text-amber-400 shrink-0" />
        <span className="text-left flex-1 min-w-0">
          <span className="block text-zinc-100 text-sm">PageRank</span>
          <span className="block text-[11px] text-zinc-500 leading-tight">
            Pessoas/empresas mais influentes em 2 hops
          </span>
        </span>
        {busy === "pagerank" && (
          <Loader2 className="size-3.5 text-zinc-400 animate-spin" />
        )}
      </button>

      <button
        disabled={disabled || busy !== null}
        onClick={runLouvain}
        className="group flex items-start gap-3 px-3 py-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800
                   border border-zinc-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Network className="size-4 mt-0.5 text-sky-400 shrink-0" />
        <span className="text-left flex-1 min-w-0">
          <span className="block text-zinc-100 text-sm">Louvain (comunidades)</span>
          <span className="block text-[11px] text-zinc-500 leading-tight">
            Agrupa nós por densidade de conexão
          </span>
        </span>
        {busy === "louvain" && (
          <Loader2 className="size-3.5 text-zinc-400 animate-spin" />
        )}
      </button>

      <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-md bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2 text-[11px] text-zinc-300">
          <Route className="size-3.5 text-violet-400" />
          Caminho mais curto
        </div>
        <input
          value={pathTarget}
          onChange={(e) => setPathTarget(e.target.value)}
          placeholder="id do nó destino"
          className="px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs
                     focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition"
        />
        <button
          disabled={disabled || !pathTarget || busy !== null}
          onClick={runPath}
          className="px-2 py-1.5 rounded bg-violet-500/15 hover:bg-violet-500/25
                     text-violet-300 text-xs font-medium border border-violet-500/30
                     disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          Buscar caminho
        </button>
      </div>

      {error && (
        <div className="text-xs text-rose-400 px-2">erro: {error}</div>
      )}

      {pagerank.length > 0 && (
        <ResultList
          title="Top influentes"
          rows={pagerank}
          format={(r) => r.score?.toFixed(4) ?? ""}
          onPick={onPickNode}
        />
      )}

      {louvain.length > 0 && (
        <ResultList
          title="Comunidades detectadas"
          rows={louvain}
          format={(r) => (r.community !== undefined ? `c${r.community}` : "")}
          onPick={onPickNode}
        />
      )}
    </div>
  );
}

function ResultList({
  title,
  rows,
  format,
  onPick,
}: {
  title: string;
  rows: Row[];
  format: (r: Row) => string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="mt-1">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1 px-1">
        {title}
      </div>
      <ul className="flex flex-col gap-0.5 max-h-72 overflow-y-auto pr-1 -mx-1">
        {rows.slice(0, 30).map((r) => (
          <li key={r.id}>
            <button
              onClick={() => onPick(r.id)}
              className="w-full text-left px-2 py-1.5 rounded hover:bg-zinc-900 flex items-center gap-2 group"
            >
              <span
                className="size-2 rounded-full shrink-0"
                style={{ background: KIND_COLOR[r.kind] }}
              />
              <span className="text-[12px] text-zinc-200 truncate flex-1">
                {r.name}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
                {format(r)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
