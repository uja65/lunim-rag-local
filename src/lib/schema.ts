// src/lib/schema.ts
export type Chunk = {
  id: string;             // stable per chunk
  text: string;           // chunk text content
  embedding: number[];    // 384-dim (MiniLM) or similar
};

export type Doc = {
  id: string;             // slug
  title: string;          // case study title
  url: string;            // source URL
  themes: ("AI" | "UX/UI" | "Web3")[]; // tags
  summary: string;        // 2-sentence summary
  chunks: Chunk[];        // chunk list
};

export type VectorIndex = {
  meta: { builtAt: string; embedModel: string; dims: number; chunkSize: number; overlap: number };
  docs: Doc[];
};
