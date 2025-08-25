// src/app/api/ask/route.ts
export const runtime = "nodejs";                                // Node for Xenova

import { NextResponse } from "next/server";
import { embedTextLocal } from "@/lib/local-embed";             // local query embed
import { loadIndex, selectChunks, summarizeDocCandidates } from "@/lib/search";
import { chatWithContext } from "@/lib/generate";               // ollama or fallback

export async function POST(req: Request) {
  try {
    const { question, filters, mode } = await req.json();       // read POST body
    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    const qvec = await embedTextLocal(question);                // local embedding
    const top = selectChunks(qvec, filters ?? null, 4);         // retrieve top-K

    const context = top                                         // build context block
      .map((t, i) => `<<SOURCE ${i + 1} — ${t.doc.title}>>\n${t.chunk.text.substring(0, 2000)}`)
      .join("\n\n");

    let answer = "";
    if (mode === "summary") {                                   // summary mode
      const uniqueDocs = summarizeDocCandidates(top);
      answer = uniqueDocs.slice(0, 1).map((d) => `${d.title}: ${d.summary}`).join("\n\n");
      if (!answer) answer = await chatWithContext(question, context);
    } else {
      answer = await chatWithContext(question, context);        // normal QA
    }

    const sources = Array.from(                                 // unique source list
      new Map(top.map((t) => [t.doc.id, { title: t.doc.title, url: t.doc.url }]))
    ).map(([, v]) => v);

    return NextResponse.json({ answer, sources });              // return to UI
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
