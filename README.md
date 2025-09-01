# Lunim Case Study RAG Assistant (Local, One-Day Prototype)
vercel link: https://lunim-rag-local-a8xc.vercel.app/
## Why
Exploring Lunim’s case studies currently requires manual reading. A retrieval-augmented assistant lets prospects and new team members **query the portfolio instantly**, improving discovery and reducing bounce.

## What
A **RAG chatbot** that answers questions like:
- “Which case study shows Web3 implementation?”
- “Summarise the AI-related work Lunim did in 2 sentences.”

It runs **fully locally for embeddings** (no credits) using `@xenova/transformers`, retrieves the most relevant case-study chunks, and generates a concise answer.

## Who
- **Prospective clients** evaluating Lunim’s capabilities.
- **New team members** needing a quick overview of past projects by theme (UX/UI, AI, Web3).

## How
- **Scrape** case studies from `studio.lunim.io` (Puppeteer + Cheerio).
- **Chunk + Embed** locally with `@xenova/transformers` (MiniLM or BGE small).
- **Retrieve** with cosine similarity over a small JSON vector index.
- **Generate** an answer using:
  - **Local (Ollama)** for fully offline responses, or
  - **Extractive fallback** (top context snippet) if no LLM is available.
- **UI**: Next.js + Tailwind; filters by theme; sticky input on top.
- **Deploy**: Vercel or Netlify. `data/index.json` is committed so the demo works without re-ingest.

**Timeboxed:** < 8 hours (scrape → ingest → UI → deploy).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

