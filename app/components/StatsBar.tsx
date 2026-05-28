"use client";

import { useEffect, useState } from "react";
import { formatNumber, KIND_COLOR, KIND_LABEL_PT } from "@/lib/utils";
import type { NodeKind } from "@/lib/types";

interface NodeStat { label: string; total: number; }
interface RelStat { type: string; total: number; }

export default function StatsBar() {
  const [nodes, setNodes] = useState<NodeStat[]>([]);
  const [rels, setRels] = useState<RelStat[]>([]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => {
        setNodes(d.nodes ?? []);
        setRels(d.rels ?? []);
      });
  }, []);

  const totalNodes = nodes.reduce((a, b) => a + b.total, 0);
  const totalRels = rels.reduce((a, b) => a + b.total, 0);

  return (
    <div className="flex items-center gap-6 text-[11px]">
      <Stat label="Nós" value={totalNodes} />
      <Stat label="Relações" value={totalRels} />
      <div className="hidden md:flex items-center gap-3 ml-2">
        {nodes.slice(0, 4).map((n) => (
          <div key={n.label} className="flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full"
              style={{ background: KIND_COLOR[n.label as keyof typeof KIND_COLOR] ?? "#71717a" }}
            />
            <span className="text-zinc-500">
              {KIND_LABEL_PT[n.label as NodeKind] ?? n.label}
            </span>
            <span className="text-zinc-300 font-mono tabular-nums">
              {formatNumber(n.total)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-100 font-mono tabular-nums text-sm">
        {value === 0 ? "—" : formatNumber(value)}
      </span>
    </div>
  );
}
