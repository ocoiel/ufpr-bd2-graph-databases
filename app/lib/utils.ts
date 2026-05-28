import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

import type { NodeKind } from "./types";

export const KIND_COLOR: Record<NodeKind, string> = {
  Officer: "#f59e0b",       // amber-500 — pessoas
  Entity: "#f43f5e",        // rose-500 — empresas offshore (alerta)
  Intermediary: "#0ea5e9",  // sky-500 — escritórios
  Address: "#a855f7",       // violet-500 — endereços
  Other: "#71717a",         // zinc-500
};

export const KIND_LABEL_PT: Record<NodeKind, string> = {
  Officer: "Pessoa",
  Entity: "Empresa offshore",
  Intermediary: "Intermediário",
  Address: "Endereço",
  Other: "Outro",
};
