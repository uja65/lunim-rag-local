// src/lib/generate.ts

// Try local Ollama first; if not available, degrade to extractive snippet.
export async function chatWithContext(prompt: string, context: string): Promise<string> {
  const base = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434"; // default local
  const model = process.env.OLLAMA_MODEL || "llama3:8b";                // pick any pulled model

  try {
    // Small instruction to force grounding in provided context.
    const sys = `You are the Lunim Case Study Assistant. Use ONLY the provided CONTEXT to answer. If the context doesn't contain the answer, say you don't know. Keep answers concise and factual.`;
    const full = `${sys}\n\nCONTEXT:\n${context}\n\nQUESTION:\n${prompt}\n\nAnswer:`;

    const r = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, prompt: full, stream: false }),
    });

    if (r.ok) {
      const j = await r.json();
      if (j?.response) return String(j.response).trim();
    }
  } catch (e) {
    // Swallow and fall back
    console.error("Ollama error:", (e as any)?.message || e);
  }

  // Fallback: return best context excerpt (extractive)
  const first = context.split("<<SOURCE")[1] || "";
  const body = first.replace(/^[^>]+>>\n?/, "").slice(0, 1200);
  return body
    ? `Generator not available. Here’s the most relevant excerpt:\n\n${body}`
    : "No local generator configured and no relevant context found.";
}
