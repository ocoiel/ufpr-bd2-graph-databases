"use client";

import { useState } from "react";
import { Plus, Trash2, Link as LinkIcon, Loader2 } from "lucide-react";
import type { NodeKind, GraphNode } from "@/lib/types";

interface Props {
  selectedNode: GraphNode | null;
  onCreatedNode?: (id: string) => void;
  onDeleted?: () => void;
  onCypher: (cypher: string) => void;
  onPickForLink: () => string | null;
}

const KINDS: NodeKind[] = ["Officer", "Entity", "Intermediary", "Address"];

export default function CrudPanel({
  selectedNode,
  onCreatedNode,
  onDeleted,
  onCypher,
  onPickForLink,
}: Props) {
  const [tab, setTab] = useState<"create" | "edit" | "link">("create");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // create form
  const [kind, setKind] = useState<NodeKind>("Officer");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [note, setNote] = useState("");

  // link form
  const [linkType, setLinkType] = useState("connected_to");
  const [linkTarget, setLinkTarget] = useState("");

  // edit form
  const [editNote, setEditNote] = useState("");

  async function createNode() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/crud/node", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, name, country, note }),
      });
      const data = await res.json();
      if (data.error) throw new Error(JSON.stringify(data.error));
      onCypher(data.cypher);
      onCreatedNode?.(data.node.id);
      setMsg(`✓ nó criado #${data.node.id}`);
      setName("");
      setNote("");
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function deleteNode() {
    if (!selectedNode) return;
    if (!confirm(`Apagar "${selectedNode.name}" e todas as suas relações?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/crud/node?id=${selectedNode.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      onCypher(data.cypher);
      onDeleted?.();
      setMsg(`✓ apagado`);
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function patchNode() {
    if (!selectedNode) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/crud/node", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: selectedNode.id,
          props: { note: editNote },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(JSON.stringify(data.error));
      onCypher(data.cypher);
      setMsg(`✓ nota atualizada`);
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function createLink() {
    if (!selectedNode || !linkTarget) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/crud/edge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceId: selectedNode.id,
          targetId: linkTarget,
          type: linkType.toUpperCase(),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(JSON.stringify(data.error));
      onCypher(data.cypher);
      setMsg(`✓ relação criada`);
      setLinkTarget("");
    } catch (e) {
      setMsg(`✗ ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
        CRUD
      </div>

      <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-900 border border-zinc-800 rounded-md">
        {(["create", "edit", "link"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-[11px] py-1.5 rounded transition ${
              tab === t ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "create" ? "Criar" : t === "edit" ? "Editar" : "Relacionar"}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <div className="flex flex-col gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as NodeKind)}
            className="px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="nome*"
            className="px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs
                       focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="país (opcional)"
            className="px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs
                       focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="nota investigativa…"
            rows={2}
            className="px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs resize-none
                       focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
          />
          <button
            disabled={!name || busy}
            onClick={createNode}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded
                       bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30
                       text-emerald-300 text-xs font-medium
                       disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
            Criar nó
          </button>
        </div>
      )}

      {tab === "edit" && (
        <div className="flex flex-col gap-2">
          {!selectedNode ? (
            <p className="text-xs text-zinc-500">Selecione um nó primeiro.</p>
          ) : (
            <>
              <div className="text-[11px] text-zinc-400">
                Editando: <span className="text-zinc-200">{selectedNode.name}</span>
              </div>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="atualizar nota…"
                rows={3}
                className="px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs resize-none
                           focus:outline-none focus:ring-1 focus:ring-sky-500/40"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={!editNote || busy}
                  onClick={patchNode}
                  className="px-2 py-1.5 rounded bg-sky-500/15 hover:bg-sky-500/25
                             border border-sky-500/30 text-sky-300 text-xs font-medium
                             disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Salvar
                </button>
                <button
                  disabled={busy}
                  onClick={deleteNode}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded
                             bg-rose-500/15 hover:bg-rose-500/25
                             border border-rose-500/30 text-rose-300 text-xs font-medium
                             disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Trash2 className="size-3" />
                  Apagar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "link" && (
        <div className="flex flex-col gap-2">
          {!selectedNode ? (
            <p className="text-xs text-zinc-500">Selecione um nó de origem primeiro.</p>
          ) : (
            <>
              <div className="text-[11px] text-zinc-400">
                Origem: <span className="text-zinc-200">{selectedNode.name}</span>
              </div>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value)}
                className="px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs"
              >
                <option value="connected_to">connected_to</option>
                <option value="officer_of">officer_of</option>
                <option value="intermediary_of">intermediary_of</option>
                <option value="same_name_as">same_name_as</option>
                <option value="suspect_of">suspect_of (custom)</option>
              </select>
              <div className="flex gap-2">
                <input
                  value={linkTarget}
                  onChange={(e) => setLinkTarget(e.target.value)}
                  placeholder="id do nó destino"
                  className="flex-1 px-2 py-1.5 rounded bg-zinc-950 border border-zinc-800 text-xs
                             focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                />
                <button
                  type="button"
                  onClick={() => {
                    const id = onPickForLink();
                    if (id) setLinkTarget(id);
                  }}
                  className="px-2 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400"
                  title="usar nó atualmente selecionado no grafo"
                >
                  usar selecionado
                </button>
              </div>
              <button
                disabled={!linkTarget || busy}
                onClick={createLink}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded
                           bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30
                           text-violet-300 text-xs font-medium
                           disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {busy ? <Loader2 className="size-3 animate-spin" /> : <LinkIcon className="size-3" />}
                Criar relação
              </button>
            </>
          )}
        </div>
      )}

      {msg && (
        <div className="text-[11px] text-zinc-400 px-1 font-mono">{msg}</div>
      )}
    </div>
  );
}
