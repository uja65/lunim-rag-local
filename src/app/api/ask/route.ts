// src/app/api/ask/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { embedTextLocal } from "@/lib/local-embed";
import { selectChunks, summarizeDocCandidates } from "@/lib/search";
import { chatWithContext } from "@/lib/generate";

type AskRequest = {
  question: string;
  filters?: ("AI" | "UX/UI" | "Web3")[];
  mode?: "summary";
};

export async function POST(req: Request) {
  try {
    const { question, filters, mode } = (await req.json()) as AskRequest;

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    const qvec = await embedTextLocal(question);
    const top = selectChunks(qvec, filters ?? null, 4);

    const context = top
      .map(
        (t, i) =>
          `<<SOURCE ${i + 1} — ${t.doc.title}>>\n${t.chunk.text.substring(0, 2000)}`
      )
      .join("\n\n");

    let answer = "";
    if (mode === "summary") {
      const uniqueDocs = summarizeDocCandidates(top);
      answer = uniqueDocs
        .slice(0, 1)
        .map((d) => `${d.title}: ${d.summary}`)
        .join("\n\n");
      if (!answer) {
        answer = await chatWithContext(question, context);
      }
    } else {
      answer = await chatWithContext(question, context);
    }

    const sources = Array.from(
      new Map(
        top.map((t) => [t.doc.id, { title: t.doc.title, url: t.doc.url }])
      )
    ).map(([, v]) => v);

    return NextResponse.json({ answer, sources });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
