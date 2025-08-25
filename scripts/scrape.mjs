// scripts/scrape.mjs
import fs from "fs/promises";                  // file ops: read/write, mkdir
import path from "path";                        // path utilities
import puppeteer from "puppeteer";              // headless browser to render SPA
import * as cheerio from "cheerio";             // HTML parsing/selection

const baseUrl = "https://studio.lunim.io/";     // root website we’re scraping
const outDir = path.resolve("data/raw");        // where we’ll save raw JSON

// Heuristic: which internal links look like case studies?
const looksLikeCaseStudy = (href = "") =>
  /case|work|portfolio|study|projects?/i.test(href) && href.startsWith("/");

// Scroll to bottom to ensure lazy content loads.
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let total = 0;
      const dist = 500;
      const timer = setInterval(() => {
        window.scrollBy(0, dist);
        total += dist;
        if (total >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}

// Visit homepage + likely directories to collect candidate links.
async function discoverCaseStudyLinks(page) {
  await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60000 });  // wait for network idle
  await autoScroll(page);                                                   // load lazy content

  // Grab all anchor hrefs from homepage.
  const anchors = await page.$$eval("a", (a) =>
    a.map((el) => ({
      href: el.getAttribute("href") || "",
      text: el.textContent?.trim() || "",
    })).filter((x) => x.href && x.text)
  );

  // Keep internal links that match our heuristic; de-dupe; strip fragments.
  const unique = Array.from(new Set(
    anchors
      .filter((a) => a.href.startsWith("/") && looksLikeCaseStudy(a.href))
      .map((a) => a.href.split("#")[0])
  ));

  // Also probe common listing paths.
  const candidates = new Set([
    ...unique,
    "/case-studies",
    "/work",
    "/projects",
    "/cases",
  ]);

  // Visit each candidate listing page to harvest more detail pages.
  for (const rel of Array.from(candidates)) {
    const url = new URL(rel, baseUrl).toString();
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await autoScroll(page);
      const more = await page.$$eval("a", (a) =>
        a.map((el) => el.getAttribute("href") || "")
         .filter(Boolean)
         .map((h) => h.split("#")[0])
      );
      more
        .filter((h) => h.startsWith("/") && looksLikeCaseStudy(h))
        .forEach((h) => candidates.add(h));   // add more detail pages
    } catch {
      // non-fatal: skip pages that error
    }
  }

  return Array.from(candidates);               // array of relative paths
}

// Scrape one page: return {url,title,body}
async function scrapeOne(page, relPath) {
  const url = new URL(relPath, baseUrl).toString();           // absolute URL
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await autoScroll(page);

  const html = await page.content();                          // full HTML
  const $ = cheerio.load(html);                               // parse DOM

  // Try common title sources
  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content") ||
    $("title").text().trim() ||
    "Untitled";

  // Remove obvious layout chrome to reduce noise
  ["header", "nav", "footer"].forEach((sel) => $(sel).remove());

  // Prefer main/article regions; fallback to body text
  const main =
    $("main").text().trim() ||
    $("article").text().trim() ||
    $('[role="main"]').text().trim() ||
    $("body").text().trim();

  // Normalize whitespace
  const body = main
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return { url, title, body };                                // structured page
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });                // ensure output dir
  const browser = await puppeteer.launch({                    // start browser
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();                       // one tab

  const links = await discoverCaseStudyLinks(page);           // find pages
  console.log(`Discovered ${links.length} candidate links.`);

  const scraped = [];
  for (const rel of links) {                                  // scrape each
    try {
      const record = await scrapeOne(page, rel);
      // Heuristic: keep pages with some substantive text
      if (record.body && record.body.split(/\s+/).length > 150) {
        scraped.push(record);
        const slug = record.title
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        const file = path.join(outDir, `${slug || "page"}.json`);
        await fs.writeFile(file, JSON.stringify(record, null, 2), "utf8");
        console.log(`Saved: ${record.title} → ${file}`);
      }
    } catch (e) {
      console.warn("Failed scraping", rel, e?.message);
    }
  }

  await browser.close();                                      // cleanup

  // Choose top 6 by length (likely “real” case studies)
  scraped.sort((a, b) => b.body.split(/\s+/).length - a.body.split(/\s+/).length);
  const top6 = scraped.slice(0, 6);
  await fs.writeFile(path.join(outDir, "_top6.json"), JSON.stringify(top6, null, 2), "utf8");
  console.log("Wrote data/raw/_top6.json with 6 pages.");
}

main().catch((e) => { console.error(e); process.exit(1); });  // entrypoint
