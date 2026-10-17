import { renderToString } from "react-dom/server";
import App from "./App";
import type { CatalogItem } from "@/lib/catalog";
import { renderSeoHead, resolveSeo, type ResolvedSeo } from "@/lib/seo";

export { CATALOG_SNAPSHOT_ID, normalizeCatalog, staticCatalog } from "@/lib/catalog";
export { serializeJsonForHtml } from "@/lib/seo";
export { buildSitemapXml, prerenderPages } from "@/lib/prerender";

/** Rota que nenhuma página usa: o App cai na página 404. */
export const NOT_FOUND_PATH = "/404";

/** Renderiza uma rota para HTML estático (usado por scripts/prerender.js). */
export function render(url: string, catalog: CatalogItem[]) {
  const collected: ResolvedSeo[] = [];

  const appHtml = renderToString(
    <App url={url} initialCatalog={catalog} seoCollector={(seo) => collected.push(seo)} />,
  );

  const seo = collected[collected.length - 1];
  if (!seo) {
    throw new Error(`A rota ${url} não declarou SEO.`);
  }

  return { appHtml, headHtml: renderSeoHead(seo) };
}

/** <head> do app-shell: título e descrição padrão, sem canonical (cada rota define o seu). */
export function renderShellHead() {
  return renderSeoHead(resolveSeo({ path: null }));
}
