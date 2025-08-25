"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type DocMeta = {
  id: string;
  title: string;
  url: string;
  themes: ("AI" | "UX/UI" | "Web3")[];
  summary: string;
};
type Msg = {
  role: "user" | "assistant";
  text: string;
  sources?: { title: string; url: string }[];
};

export default function Page() {
  // ---- state: docs metadata for sidebar
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // ---- state: chat messages
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi! I’m the Lunim Case Study Assistant. \nUse the filters to narrow by theme.",
    },
  ]);

  // ---- input + filters
  const [question, setQuestion] = useState("");
  const [filters, setFilters] = useState<Record<string, boolean>>({
    "UX/UI": true,
    AI: true,
    Web3: true,
  });
  const activeFilters = useMemo(
    () => Object.entries(filters).filter(([, v]) => v).map(([k]) => k),
    [filters]
  );
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Fetch docs metadata for sidebar
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/docs");
        const j = (await r.json()) as { docs?: DocMeta[] };
        setDocs(j.docs || []);
      } catch {
        // ignore for sidebar
      } finally {
        setLoadingDocs(false);
      }
    })();
  }, []);

  // Autoscroll chat to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  // Call /api/ask with question + filters; mode optional ("summary")
  async function ask(mode?: "summary") {
    if (!question.trim()) return;
    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, filters: activeFilters, mode }),
      });
      const j: unknown = await r.json();

      if (
        typeof j === "object" &&
        j !== null &&
        "error" in j &&
        typeof (j as { error: unknown }).error === "string"
      ) {
        throw new Error((j as { error: string }).error);
      }

      const payload = j as { answer?: string; sources?: { title: string; url: string }[] };
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: payload.answer ?? "(no answer)",
          sources: payload.sources ?? [],
        },
      ]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Error: " + msg },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-semibold tracking-wide">Lunim Case Study Assistant</div>
          <div className="text-sm opacity-80">Local RAG • Xenova • Next.js</div>
        </div>
      </header>

      {/* Main layout */}
      <main className="max-w-5xl mx-auto px-4 py-6 grid md:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar: filters + doc list */}
        <aside className="space-y-6">
          <section className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Filters</h3>
            {["UX/UI", "AI", "Web3"].map((t) => (
              <label key={t} className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={filters[t]}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, [t]: e.target.checked }))
                  }
                />
                <span>{t}</span>
              </label>
            ))}
          </section>

          <section className="bg-white rounded-xl shadow p-4">
            <h3 className="font-semibold mb-3">Case Studies</h3>
            {loadingDocs && (
              <p className="text-sm text-neutral-500">Loading…</p>
            )}
            {!loadingDocs && docs.length === 0 && (
              <p className="text-sm text-neutral-500">
                No documents found. Run the scrape/ingest scripts.
              </p>
            )}
            <ul className="space-y-3">
              {docs.map((d) => (
                <li key={d.id} className="text-sm">
                  <div className="font-medium">{d.title}</div>
                  <div className="text-xs text-neutral-600">
                    {d.themes.join(" • ")}
                  </div>
                  <div className="text-xs text-neutral-700 mt-1">
                    {d.summary}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        {/* Chat panel */}
        <section className="bg-white rounded-xl shadow p-4 flex flex-col">
          <div className="flex-1 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className="mb-4">
                <div
                  className={
                    m.role === "user"
                      ? "bg-blue-600 text-white border border-blue-700 rounded-lg p-3"
                      : "bg-white text-neutral-900 border border-neutral-200 rounded-lg p-3"
                  }
                >
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                    {m.text}
                  </pre>
                  {!!m.sources?.length && (
                    <div className="mt-2 text-xs text-neutral-700">
                      <span>Sources: </span>
                      <span>
                        {m.sources.map((s, idx) => (
                          <span key={s.url}>
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline text-blue-600 hover:text-blue-700"
                            >
                              {s.title}
                            </a>
                            {idx < (m.sources?.length ?? 0) - 1 ? (
                              <span> • </span>
                            ) : null}
                          </span>
                        ))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <div className="text-sm text-neutral-500">Thinking…</div>}
            <div ref={endRef} />
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white text-neutral-900 placeholder:text-neutral-500"
              placeholder="Ask about Lunim’s case studies…"
            />
            <button
              onClick={() => ask()}
              disabled={busy}
              className="px-3 py-2 text-sm rounded-lg bg-black text-white disabled:opacity-50"
            >
              Ask
            </button>
            <button
              onClick={() => ask("summary")}
              disabled={busy || !question.trim()}
              className="px-3 py-2 text-sm rounded-lg border"
              title="Summarize the best-matching case study for this query"
            >
              Summarize
            </button>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} Lunim – Local RAG demo
      </footer>
    </div>
  );
}
