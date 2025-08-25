// src/app/api/docs/route.ts
export const runtime = "nodejs";                    // ensure Node, not Edge

import { NextResponse } from "next/server";
import { loadIndex } from "@/lib/search";

export async function GET() {
  const { docs, meta } = loadIndex();              // read local index
  return NextResponse.json({
    meta,
    docs: docs.map((d) => ({                       // light payload for UI
      id: d.id,
      title: d.title,
      url: d.url,
      themes: d.themes,
      summary: d.summary,
    })),
  });
}
