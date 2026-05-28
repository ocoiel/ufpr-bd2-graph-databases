"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, GitBranch } from "lucide-react";
import SearchPanel from "@/components/SearchPanel";
import NodePanel from "@/components/NodePanel";
import QueryPanel from "@/components/QueryPanel";
import AlgorithmsPanel from "@/components/AlgorithmsPanel";
import CrudPanel from "@/components/CrudPanel";
import StatsBar from "@/components/StatsBar";
import { KIND_COLOR } from "@/lib/utils";
import type { GraphEdge, GraphNode, NodeKind, SearchHit } from "@/lib/types";

const GraphView = dynamic(() => import("@/components/GraphView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
      Carregando visualização…
    </div>
  ),
});

type TabId = "search" | "algorithms" | "crud";

export default function Home() {
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>({
    nodes: [],
    edges: [],
  });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedHitId, setSelectedHitId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [lastCypher, setLastCypher] = useState<string | undefined>();
  const [lastElapsed, setLastElapsed] = useState<number | undefined>();
  const [highlightIds, setHighlightIds] = useState<string[]>([]);
  const [communityById, setCommunityById] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const loadNeighborhood = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/node/${id}`);
      const data = await res.json();
      setGraph({ nodes: data.nodes ?? [], edges: data.edges ?? [] });
      setSelectedNode(
        (data.nodes ?? []).find((n: GraphNode) => n.id === id) ?? null,
      );
      setLastCypher(data.cypher);
      setLastElapsed(data.elapsedMs);
      setHighlightIds([]);
      setCommunityById({});
      setSelectedHitId(id);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleHit = useCallback(
    (hit: SearchHit) => {
      loadNeighborhood(hit.id);
    },
    [loadNeighborhood],
  );

  const handleNodeClick = useCallback((n: GraphNode) => {
    setSelectedNode(n);
    setSelectedHitId(n.id);
  }, []);

  const handlePath = useCallback(async (source: string, target: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/path?source=${source}&target=${target}&hops=6`);
      const data = await res.json();
      if (data.nodes && data.nodes.length > 0) {
        setGraph({ nodes: data.nodes, edges: data.edges });
        setHighlightIds([
          ...data.nodes.map((n: GraphNode) => n.id),
          ...data.edges.map((e: GraphEdge) => e.id),
        ]);
        setLastCypher(data.cypher);
        setLastElapsed(data.elapsedMs);
      } else {
        alert("Nenhum caminho encontrado em até 6 hops.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selectedNode?.id ?? null;
  }, [selectedNode]);

  return (
    <div className="grid grid-rows-[56px_1fr_220px] grid-cols-[320px_1fr_400px] h-screen">
      <header className="col-span-3 row-start-1 border-b border-zinc-800 flex items-center px-6 gap-6">
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-md bg-gradient-to-br from-amber-400 to-rose-500 grid place-items-center text-zinc-950 font-bold text-sm">
            G
          </div>
          <div className="leading-tight">
            <div className="text-sm text-zinc-100 font-medium">Offshore Graph</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              ICIJ · Neo4j · BD2 UFPR
            </div>
          </div>
        </div>
        <div className="h-6 w-px bg-zinc-800" />
        <StatsBar />
        <div className="ml-auto flex items-center gap-2 text-[11px] text-zinc-500">
          {loading ? (
            <>
              <Activity className="size-3.5 animate-pulse text-amber-400" />
              executando…
            </>
          ) : (
            <>
              <span className="size-1.5 rounded-full bg-emerald-500" />
              conectado
            </>
          )}
        </div>
      </header>

      <aside className="col-start-1 row-start-2 row-span-2 border-r border-zinc-800 flex flex-col">
        <div className="grid grid-cols-3 gap-1 p-2 border-b border-zinc-800">
          {(["search", "algorithms", "crud"] as TabId[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`text-[11px] uppercase tracking-wider py-1.5 rounded transition ${
                activeTab === t
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t === "search" ? "Busca" : t === "algorithms" ? "Algoritmos" : "CRUD"}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "search" && (
            <SearchPanel onSelect={handleHit} selectedId={selectedHitId} />
          )}
          {activeTab === "algorithms" && (
            <AlgorithmsPanel
              rootId={selectedNode?.id ?? null}
              onPickNode={loadNeighborhood}
              onShowPath={handlePath}
              onCommunityResult={setCommunityById}
              onResetView={() => setHighlightIds([])}
              onCypher={(cypher, elapsed) => {
                setLastCypher(cypher);
                setLastElapsed(elapsed);
              }}
            />
          )}
          {activeTab === "crud" && (
            <CrudPanel
              selectedNode={selectedNode}
              onCreatedNode={(id) => loadNeighborhood(id)}
              onDeleted={() => {
                setGraph({ nodes: [], edges: [] });
                setSelectedNode(null);
              }}
              onCypher={(cypher) => setLastCypher(cypher)}
              onPickForLink={() => selectedRef.current}
            />
          )}
        </div>
      </aside>

      <main className="col-start-2 row-start-2 relative min-h-0 overflow-hidden">
        {graph.nodes.length === 0 ? (
          <EmptyState />
        ) : (
          <GraphView
            nodes={graph.nodes}
            edges={graph.edges}
            highlightIds={highlightIds}
            communityById={communityById}
            onNodeClick={handleNodeClick}
            selectedId={selectedNode?.id}
          />
        )}
      </main>

      <aside className="col-start-3 row-start-2 row-span-2 border-l border-zinc-800 flex flex-col">
        <NodePanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onExpand={(n) => loadNeighborhood(n.id)}
        />
      </aside>

      <section className="col-start-2 row-start-3 border-t border-zinc-800">
        <QueryPanel cypher={lastCypher} elapsedMs={lastElapsed} />
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-12">
      <div className="flex items-center gap-3">
        <GitBranch className="size-5 text-zinc-700" />
        <span className="text-zinc-500 text-sm">
          Busca pra começar a investigar — tenta{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono">
            Putin
          </kbd>
          ,{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono">
            Mossack
          </kbd>
          ,{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-mono">
            Brazil
          </kbd>
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
        <Legend kind="Officer" label="Pessoa" />
        <Legend kind="Entity" label="Empresa offshore" />
        <Legend kind="Intermediary" label="Intermediário" />
        <Legend kind="Address" label="Endereço" />
      </div>
    </div>
  );
}

function Legend({ kind, label }: { kind: NodeKind; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-800/60">
      <span className="size-2.5 rounded-full" style={{ background: KIND_COLOR[kind] }} />
      <span className="text-xs text-zinc-400">{label}</span>
    </div>
  );
}
