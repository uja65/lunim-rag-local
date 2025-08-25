// src/lib/local-embed.ts
import { pipeline } from "@xenova/transformers";         // Xenova runtime

const MODEL_ID = process.env.LOCAL_EMBED_MODEL || "Xenova/all-MiniLM-L6-v2"; // same family as ingest
let extractorPromise: any;                                // memoized loader

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_ID, { quantized: true });
  }
  return extractorPromise;
}

export async function embedTextLocal(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const out: any = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(out.data);                            // Float32Array -> number[]
}
