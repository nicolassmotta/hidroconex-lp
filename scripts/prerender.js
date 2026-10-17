// Gera HTML estático para as rotas públicas depois do `vite build`.
// Cada página sai com <title>, meta tags, canonical, JSON-LD e conteúdo prontos,
// sem depender de JavaScript para o Google, o WhatsApp e afins lerem a página.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");
const SSR_DIR = path.join(ROOT_DIR, "dist-ssr");
const SSR_ENTRY = path.join(SSR_DIR, "entry-server.js");

// Catálogo publicado (MongoDB via API). PRERENDER_CATALOG_URL="" força o catálogo estático.
const DEFAULT_CATALOG_URL = "https://hidroconexluvas.com.br/api/catalog";
const CATALOG_TIMEOUT_MS = 15_000;

// Servido pela Vercel nas rotas sem HTML gerado (/admin e produtos criados depois do build).
const APP_SHELL_FILE = "app-shell.html";

async function fetchPublishedCatalog(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data?.products) || data.products.length === 0) {
      throw new Error("resposta sem produtos");
    }

    return data.products;
  } catch (error) {
    console.warn(
      `[prerender] Catálogo publicado indisponível em ${url} (${error.message}). Usando o catálogo estático.`,
    );
    return null;
  }
}

function fillTemplate(template, { headHtml, appHtml = "", dataHtml = "" }) {
  for (const placeholder of ["<!--app-head-->", "<!--app-html-->", "<!--app-data-->"]) {
    if (!template.includes(placeholder)) {
      throw new Error(`index.html sem o marcador ${placeholder}.`);
    }
  }

  // Funções de substituição: o HTML gerado pode conter "$&" e afins vindos do catálogo.
  return template
    .replace("<!--app-head-->", () => headHtml)
    .replace("<!--app-html-->", () => appHtml)
    .replace("<!--app-data-->", () => dataHtml);
}

function outputFileFor(routePath) {
  return routePath === "/"
    ? path.join(DIST_DIR, "index.html")
    : path.join(DIST_DIR, ...routePath.split("/").filter(Boolean), "index.html");
}

async function writeFile(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function prerender() {
  const template = await fs.readFile(path.join(DIST_DIR, "index.html"), "utf8");
  const ssr = await import(pathToFileURL(SSR_ENTRY).href);

  const catalogUrl = process.env.PRERENDER_CATALOG_URL ?? DEFAULT_CATALOG_URL;
  const publishedProducts = catalogUrl ? await fetchPublishedCatalog(catalogUrl) : null;
  const products = publishedProducts
    ? ssr.normalizeCatalog(publishedProducts)
    : ssr.staticCatalog();

  const catalogData = `<script id="${ssr.CATALOG_SNAPSHOT_ID}" type="application/json">${ssr.serializeJsonForHtml(products)}</script>`;
  const pages = ssr.prerenderPages(products);

  for (const page of pages) {
    const { appHtml, headHtml } = ssr.render(page.path, products);
    await writeFile(
      outputFileFor(page.path),
      fillTemplate(template, { headHtml, appHtml, dataHtml: catalogData }),
    );
  }

  // A Vercel serve dist/404.html (com status 404) em qualquer rota sem arquivo.
  const notFound = ssr.render(ssr.NOT_FOUND_PATH, products);
  await writeFile(path.join(DIST_DIR, "404.html"), fillTemplate(template, notFound));

  await writeFile(
    path.join(DIST_DIR, APP_SHELL_FILE),
    fillTemplate(template, { headHtml: ssr.renderShellHead() }),
  );

  await writeFile(path.join(DIST_DIR, "sitemap.xml"), ssr.buildSitemapXml(pages));

  const source = publishedProducts ? catalogUrl : "catálogo estático";
  console.log(
    `[prerender] ${pages.length} páginas, 404, ${APP_SHELL_FILE} e sitemap.xml gerados (${products.length} produtos de ${source}).`,
  );
}

try {
  await prerender();
} finally {
  await fs.rm(SSR_DIR, { recursive: true, force: true });
}
