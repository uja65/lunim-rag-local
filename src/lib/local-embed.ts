// src/lib/local-embed.ts
import { pipeline } from "@xenova/transformers";

type Extractor = (
  input: string | string[],
  options?: { pooling?: string; normalize?: boolean }
) => Promise<{ data: Float32Array } | { tolist: () => number[][] }>;

const MODEL_ID =
  process.env.LOCAL_EMBED_MODEL || "Xenova/all-MiniLM-L6-v2";

// Cache the extractor between invocations
let extractorPromise: Promise<Extractor> | null = null;

async function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      MODEL_ID,
      { quantized: true }
      // The runtime returns a callable extractor
    ) as Promise<Extractor>;
  }
  return extractorPromise;
}

export async function embedTextLocal(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const out = await extractor(text, { pooling: "mean", normalize: true });

  // Single input path returns { data: Float32Array }
  if ("data" in out && out.data instanceof Float32Array) {
    return Array.from(out.data);
  }

  // Batch path (shouldn't happen for single string, but guard anyway)
  if ("tolist" in out && typeof out.tolist === "function") {
    const arr = out.tolist();
    // Return the first vector if present
    return Array.isArray(arr) && Array.isArray(arr[0]) ? arr[0] : [];
  }

  // Fallback
  return [];
}
