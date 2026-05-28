"use client";

import { Database, Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  cypher?: string;
  elapsedMs?: number;
  label?: string;
}

const KEYWORDS = new Set([
  "MATCH", "WHERE", "RETURN", "WITH", "CALL", "YIELD", "CREATE",
  "MERGE", "SET", "DELETE", "DETACH", "ORDER", "BY", "LIMIT",
  "AS", "AND", "OR", "NOT", "UNWIND", "COLLECT", "DISTINCT",
  "OPTIONAL", "UNION", "ALL", "ON", "OFF",
]);

function highlight(line: string) {
  return line.split(/(\s+|[,()\[\]{}])/).map((tok, i) => {
    if (!tok) return null;
    if (KEYWORDS.has(tok.toUpperCase())) {
      return (
        <span key={i} className="text-amber-300 font-medium">
          {tok}
        </span>
      );
    }
    if (/^\$[A-Za-z_]\w*$/.test(tok)) {
      return (
        <span key={i} className="text-sky-300">
          {tok}
        </span>
      );
    }
    if (/^'[^']*'$/.test(tok) || /^"[^"]*"$/.test(tok)) {
      return (
        <span key={i} className="text-emerald-300">
          {tok}
        </span>
      );
    }
    if (/^\d+$/.test(tok)) {
      return (
        <span key={i} className="text-fuchsia-300">
          {tok}
        </span>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

export default function QueryPanel({ cypher, elapsedMs, label = "Cypher executado" }: Props) {
  const [copied, setCopied] = useState(false);
  if (!cypher) {
    return (
      <div className="p-5 text-xs text-zinc-500">
        Nenhuma query executada ainda.
      </div>
    );
  }
  const lines = cypher.trim().split("\n");
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
          <Database className="size-3.5" />
          {label}
          {elapsedMs !== undefined && (
            <span className="text-zinc-600 font-mono tabular-nums normal-case tracking-normal ml-1">
              · {elapsedMs}ms
            </span>
          )}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(cypher.trim());
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          }}
          className="text-zinc-500 hover:text-zinc-200 transition"
          aria-label="Copiar"
        >
          {copied ? (
            <Check className="size-3.5 text-emerald-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
        </button>
      </div>
      <pre className="flex-1 overflow-auto px-5 py-4 text-[12px] leading-relaxed font-mono">
        {lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="select-none text-zinc-700 w-6 shrink-0 text-right pr-2 tabular-nums">
              {i + 1}
            </span>
            <span className="text-zinc-300">{highlight(line)}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
