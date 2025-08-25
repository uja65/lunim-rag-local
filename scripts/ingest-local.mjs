// scripts/ingest-local.mjs
import fs from "fs/promises";                               // file ops
import path from "path";                                     // paths
import { pipeline } from "@xenova/transformers";             // local models (WASM/ONNX)

// Where to read/write
const RAW_DIR = path.resolve("data/raw");
const OUT_FILE = path.resolve("data/index.json");

// Quick theme tags via keywords (cheap + fast)
function inferThemes(text) {
  const t = text.toLowerCase();
  const themes = new Set();
  if (/\b(blockchain|smart contract|web3|wallet|token|solidity|evm)\b/.test(t)) themes.add("Web3");
  if (/\b(ai|ml|machine learning|gpt|llm|rag|embedding|computer vision)\b/.test(t)) themes.add("AI");
  if (/\b(ux|ui|design|wireframe|prototype|usability|accessibility|figma)\b/.test(t)) themes.add("UX/UI");
  if (themes.size === 0) themes.add("UX/UI");               // default if unknown
  return Array.from(themes);
}

// Naive 2-sentence extractive summary (no LLM, deterministic)
function naiveSummary(title, body) {
  const text = `${title}. ${body}`.replace(/\s+/g, " ").trim();
  const sents = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  // Score by useful words + non-trivial length
  const score = (s) =>
    (/\b(result|outcome|deliver|implemented|launched|improved|increase|reduce)\b/i.test(s) ? 2 : 0) +
    (/\b(ai|ml|web3|ux|ui|design|prototype|rag|agent|automation)\b/i.test(s) ? 1 : 0) +
    Math.min(s.length / 120, 1);
  return [...sents].sort((a, b) => score(b) - score(a)).slice(0, 2).join(" ");
}

// Token-agnostic chunking by words
function chunkText(text, max = 900, overlap = 150) {
  const words = text.split(/\s+/);
  const chunks = [];
  let i = 0;
  while (i < words.length) {
    const piece = words.slice(i, i + max).join(" ").trim();
    if (piece) chunks.push(piece);
    i += max - overlap;
  }
  return chunks;
}

// Local embedding model IDs (you can switch to BGE for stronger retrieval)
const MODEL_ID = process.env.LOCAL_EMBED_MODEL || "Xenova/all-MiniLM-L6-v2";
let extractorPromise;

// Lazy-load model once (cached across calls)
async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline("feature-extraction", MODEL_ID, { quantized: true });
  }
  return extractorPromise;
}

// Batch embed (returns number[][])
async function embedBatch(texts) {
  const extractor = await getExtractor();
  const out = await extractor(texts, { pooling: "mean", normalize: true });
  // transformers.js returns a Tensor; tolist() gives plain arrays
  return typeof out.tolist === "function" ? out.tolist() : out.data;
}

async function main() {
  const files = (await fs.readdir(RAW_DIR)).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  if (files.length === 0) throw new Error("No raw .json files in data/raw. Run scrape first.");

  const docs = [];
  for (const f of files) {
    const rec = JSON.parse(await fs.readFile(path.join(RAW_DIR, f), "utf8"));
    const { url, title, body } = rec;
    const themes = inferThemes(`${title}\n${body}`);        // classify
    const summary = naiveSummary(title, body);              // free summary
    const chunks = chunkText(body);                         // chunk body

    // Embed chunks in mini-batches for speed
    const embeddings = [];
    const batchSize = 32;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const vecs = await embedBatch(batch);                // 384-dim vectors
      embeddings.push(...vecs);
    }

    // Assemble per-chunk objects (id + text + vector)
    const chunkObjs = chunks.map((text, i) => ({
      id: `${title.replace(/[^a-z0-9]+/gi, "-")}-${i}`,
      text,
      embedding: embeddings[i],
    }));

    docs.push({
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), // doc slug
      title,
      url,
      themes,
      summary,
      chunks: chunkObjs,
    });
  }

  // Final vector index JSON
  const index = {
    meta: {
      builtAt: new Date().toISOString(),
      embedModel: MODEL_ID,
      dims: docs[0]?.chunks[0]?.embedding?.length || 0,
      chunkSize: 900,
      overlap: 150,
    },
    docs,
  };

  await fs.writeFile(OUT_FILE, JSON.stringify(index, null, 2), "utf8");
  console.log(`Wrote ${OUT_FILE} with ${docs.length} docs and ${
    docs.reduce((a, d) => a + d.chunks.length, 0)
  } chunks. Model: ${MODEL_ID}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
