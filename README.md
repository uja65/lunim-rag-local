# Lunim Case Study RAG Assistant (Local, One-Day Prototype)

## Why
Exploring Lunim’s case studies currently requires manual reading. A retrieval-augmented assistant lets prospects and new team members **query the portfolio instantly**, improving discovery and reducing bounce.

## What
A **RAG chatbot** that answers questions like:
- “Which case study shows Web3 implementation?”
- “Summarise the AI-related work Lunim did in 2 sentences.”

It runs **fully locally for embeddings** (no credits) using `@xenova/transformers`, retrieves the most relevant case-study chunks, and generates a concise answer (via a local LLM with Ollama or an extractive fallback).

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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
