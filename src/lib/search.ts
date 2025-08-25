// src/lib/search.ts
import fs from "fs";                                      // sync read ok on boot
import path from "path";
import type { VectorIndex, Doc, Chunk } from "./schema";

let INDEX: VectorIndex | null = null;                     // cache index in memory

export function loadIndex(): VectorIndex {
  if (!INDEX) {                                           // lazy load once
    const p = path.resolve("data/index.json");            // local file path
    const raw = fs.readFileSync(p, "utf8");               // read JSON
    INDEX = JSON.parse(raw);                              // parse to object
  }
  return INDEX!;
}

export function cosineSim(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;                            // dot & norms
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);      // cosine similarity
}

// Get top-K chunks matching qvec, constrained by theme filters (if provided)
export function selectChunks(
  qvec: number[],
  filters: ("AI" | "UX/UI" | "Web3")[] | null,
  k = 4
) {
  const { docs } = loadIndex();
  const pool: { doc: Doc; chunk: Chunk; score: number }[] = [];

  for (const doc of docs) {
    if (filters && !doc.themes.some((t) => filters.includes(t))) continue; // theme filter
    for (const ch of doc.chunks) {
      const s = cosineSim(qvec, ch.embedding);            // similarity score
      pool.push({ doc, chunk: ch, score: s });            // collect candidate
    }
  }

  pool.sort((a, b) => b.score - a.score);                 // best first
  return pool.slice(0, k);                                // top-K final
}

// Keep unique docs from chunk candidates (for summaries/sources)
export function summarizeDocCandidates(cands: { doc: Doc }[]) {
  const seen = new Set<string>();
  const out: Doc[] = [];
  for (const c of cands) {
    if (!seen.has(c.doc.id)) {
      seen.add(c.doc.id);
      out.push(c.doc);
    }
  }
  return out;
}
