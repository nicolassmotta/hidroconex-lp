import { catalogCategories } from "@/data/categories";
import { type CatalogItem, resolveCatalogImage } from "@/lib/catalog";
import { absoluteUrl, categoryPath, productPath } from "@/lib/siteUrls";

export interface PrerenderPage {
  path: string;
  /** Data (AAAA-MM-DD) da última alteração conhecida; vira <lastmod> no sitemap. */
  lastModified?: string;
  /** Imagens absolutas da página para o sitemap de imagens. */
  images: string[];
  /** Fica fora do sitemap (ex.: categoria ainda sem produtos), mas o HTML é gerado. */
  excludeFromSitemap?: boolean;
}

function dateOnly(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
}

function latestDate(products: CatalogItem[]) {
  const dates = products
    .map((product) => dateOnly(product.updatedAt))
    .filter((value): value is string => Boolean(value))
    .sort();

  return dates[dates.length - 1];
}

function productImages(product: CatalogItem) {
  const image = resolveCatalogImage(product);
  return image.includes("placeholder.svg") ? [] : [absoluteUrl(image)];
}

/** Todas as rotas públicas que viram HTML estático no build. */
export function prerenderPages(products: CatalogItem[]): PrerenderPage[] {
  const pages: PrerenderPage[] = [
    { path: "/", images: [] },
    { path: "/catalogo", lastModified: latestDate(products), images: [] },
  ];

  for (const category of catalogCategories) {
    const categoryProducts = products.filter((product) => product.categoryId === category.id);
    pages.push({
      path: categoryPath(category),
      lastModified: latestDate(categoryProducts),
      images: [],
      excludeFromSitemap: categoryProducts.length === 0,
    });
  }

  // Dois ids que viram o mesmo slug apontariam para a mesma URL; vale o primeiro, como no app.
  const seenPaths = new Set(pages.map((page) => page.path));
  for (const product of products) {
    const path = productPath(product);
    if (seenPaths.has(path)) continue;

    seenPaths.add(path);
    pages.push({
      path,
      lastModified: dateOnly(product.updatedAt),
      images: productImages(product),
    });
  }

  return pages;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapXml(pages: PrerenderPage[]) {
  const urls = pages
    .filter((page) => !page.excludeFromSitemap)
    .map((page) => {
      const lines = [`    <loc>${escapeXml(absoluteUrl(page.path))}</loc>`];

      if (page.lastModified) {
        lines.push(`    <lastmod>${page.lastModified}</lastmod>`);
      }

      for (const image of page.images) {
        lines.push(`    <image:image><image:loc>${escapeXml(image)}</image:loc></image:image>`);
      }

      return `  <url>\n${lines.join("\n")}\n  </url>`;
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}
