"use client";

import { X, ExternalLink } from "lucide-react";
import type { GraphNode } from "@/lib/types";
import { KIND_COLOR, KIND_LABEL_PT } from "@/lib/utils";

interface Props {
  node: GraphNode | null;
  onClose?: () => void;
  onExpand?: (node: GraphNode) => void;
}

const RELEVANT_KEYS = [
  ["name", "Nome"],
  ["address", "Endereço"],
  ["country", "País"],
  ["countries", "Países"],
  ["jurisdiction", "Jurisdição"],
  ["jurisdiction_description", "Jurisdição (desc.)"],
  ["company_type", "Tipo de empresa"],
  ["incorporation_date", "Data de constituição"],
  ["inactivation_date", "Data de inativação"],
  ["struck_off_date", "Data de baixa"],
  ["status", "Status"],
  ["service_provider", "Provedor"],
  ["sourceID", "Fonte (vazamento)"],
  ["note", "Nota"],
] as const;

export default function NodePanel({ node, onClose, onExpand }: Props) {
  if (!node) {
    return (
      <div className="p-6 text-sm text-zinc-500">
        Clique num nó do grafo ou num resultado de busca pra ver detalhes.
      </div>
    );
  }
  const props = node.raw ?? {};
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-start gap-3 p-5 border-b border-zinc-800">
        <span
          className="size-3 rounded-full mt-1.5 shrink-0"
          style={{ background: KIND_COLOR[node.kind] }}
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
            {KIND_LABEL_PT[node.kind]}
          </div>
          <h2 className="text-base text-zinc-100 font-medium leading-tight mt-0.5 break-words">
            {node.name}
          </h2>
          <div className="text-[11px] text-zinc-600 font-mono mt-1">
            id: {node.id}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition p-0.5"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
        {RELEVANT_KEYS.map(([key, label]) => {
          const v = props[key];
          if (v === undefined || v === null || v === "") return null;
          return (
            <div key={key} className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                {label}
              </span>
              <span className="text-xs text-zinc-200 break-words">
                {String(v)}
              </span>
            </div>
          );
        })}
      </div>

      {onExpand && (
        <div className="p-3 border-t border-zinc-800">
          <button
            onClick={() => onExpand(node)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md
                       bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-sm text-zinc-200
                       transition"
          >
            <ExternalLink className="size-3.5" />
            Expandir vizinhança
          </button>
        </div>
      )}
    </div>
  );
}
