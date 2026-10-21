import { catalogCategories, getCategoryMeta, type CatalogCategory } from "@/data/categories";
import { businessHours, formatTime, FOUNDED_AT } from "@/data/company";
import type { FaqItem } from "@/data/faq";
import type { CatalogItem } from "@/lib/catalog";
import { absoluteUrl, categoryPath, productPath, SITE_URL } from "@/lib/siteUrls";

export const SITE_NAME = "Hidroconex";
export const JSON_LD_SCRIPT_ID = "page-json-ld";

const META_DESCRIPTION_MAX_LENGTH = 160;
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const LEGAL_NAME = "Hidroconex Indústria e Comércio Ltda";
const TELEPHONE = "+55 17 99772-6171";
const EMAIL = "hidroconex@terra.com.br";
const LOGO_PATH = "/logo-hidroconex.jpeg";

export const defaultSeo = {
  title: "Luvas de Aço Carbono e Conexões Industriais | Hidroconex",
  description:
    "Luvas de aço carbono, niples, juntas, plugs e filtros para tanques subterrâneos e reservatórios metálicos. Fábrica própria em São José do Rio Preto (SP).",
  image: "/og-hidroconex.jpg",
  imageAlt: "Hidroconex: luvas de aço carbono e conexões industriais",
};

export const catalogSeo = {
  title: "Catálogo de Luvas, Niples e Conexões Industriais | Hidroconex",
  description:
    "Catálogo Hidroconex de luvas de aço carbono, niples, juntas, plugs e filtros para tanques subterrâneos e reservatórios metálicos. Solicite orçamento técnico.",
};

type StructuredData = Array<Record<string, unknown>> | Record<string, unknown>;

export interface SeoInput {
  title?: string;
  description?: string;
  /** Caminho canônico da página; null omite o canonical (ex.: página 404). */
  path?: string | null;
  image?: string;
  imageAlt?: string;
  type?: "website" | "product";
  robots?: string;
  structuredData?: StructuredData;
}

/** Valores finais (só strings) usados tanto no HTML pré-renderizado quanto no navegador. */
export interface ResolvedSeo {
  title: string;
  description: string;
  canonical: string | null;
  robots: string;
  type: string;
  image: string;
  imageAlt: string;
  jsonLd: string | null;
}

export interface SeoMetaTag {
  attribute: "name" | "property";
  key: string;
  content: string;
}

export function truncateText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;

  const cut = text.slice(0, maxLength - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:-]+$/, "")}…`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** JSON seguro para ficar dentro de <script> no HTML (texto do admin não fecha a tag). */
export function serializeJsonForHtml(data: unknown) {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function serializeJsonLd(structuredData: StructuredData) {
  const data = Array.isArray(structuredData) ? structuredData : [structuredData];
  if (data.length === 1) return serializeJsonForHtml(data[0]);

  return serializeJsonForHtml({
    "@context": "https://schema.org",
    "@graph": data.map(({ "@context": _context, ...entity }) => entity),
  });
}

export function resolveSeo({
  title = defaultSeo.title,
  description = defaultSeo.description,
  path = "/",
  image = defaultSeo.image,
  imageAlt,
  type = "website",
  robots = "index,follow",
  structuredData,
}: SeoInput): ResolvedSeo {
  return {
    title,
    description: truncateText(description, META_DESCRIPTION_MAX_LENGTH),
    canonical: path === null ? null : absoluteUrl(path),
    robots,
    type,
    image: absoluteUrl(image),
    imageAlt: imageAlt || (image === defaultSeo.image ? defaultSeo.imageAlt : title),
    jsonLd: structuredData ? serializeJsonLd(structuredData) : null,
  };
}

export function seoMetaTags(seo: ResolvedSeo): SeoMetaTag[] {
  const tags: SeoMetaTag[] = [
    { attribute: "name", key: "description", content: seo.description },
    { attribute: "name", key: "robots", content: seo.robots },
    { attribute: "property", key: "og:site_name", content: SITE_NAME },
    { attribute: "property", key: "og:locale", content: "pt_BR" },
    { attribute: "property", key: "og:type", content: seo.type },
    { attribute: "property", key: "og:title", content: seo.title },
    { attribute: "property", key: "og:description", content: seo.description },
    { attribute: "property", key: "og:image", content: seo.image },
    { attribute: "property", key: "og:image:alt", content: seo.imageAlt },
    { attribute: "name", key: "twitter:card", content: "summary_large_image" },
    { attribute: "name", key: "twitter:title", content: seo.title },
    { attribute: "name", key: "twitter:description", content: seo.description },
    { attribute: "name", key: "twitter:image", content: seo.image },
    { attribute: "name", key: "twitter:image:alt", content: seo.imageAlt },
  ];

  if (seo.canonical) {
    tags.push({ attribute: "property", key: "og:url", content: seo.canonical });
  }

  return tags;
}

/** Tags do <head> gravadas no HTML estático durante o build (scripts/prerender.js). */
export function renderSeoHead(seo: ResolvedSeo) {
  const lines = [`<title>${escapeHtml(seo.title)}</title>`];

  if (seo.canonical) {
    lines.push(`<link rel="canonical" href="${escapeHtml(seo.canonical)}" />`);
  }

  for (const tag of seoMetaTags(seo)) {
    lines.push(`<meta ${tag.attribute}="${tag.key}" content="${escapeHtml(tag.content)}" />`);
  }

  if (seo.jsonLd) {
    lines.push(`<script id="${JSON_LD_SCRIPT_ID}" type="application/ld+json">${seo.jsonLd}</script>`);
  }

  return lines.join("\n  ");
}

export function categorySeoTitle(category: CatalogCategory) {
  return `${category.seoTitle} | ${SITE_NAME}`;
}

export function categorySeoDescription(category: CatalogCategory) {
  return `${category.description} Consulte os modelos e solicite orçamento técnico com a Hidroconex.`;
}

export function productSeoTitle(product: CatalogItem) {
  return `${product.model} para ${product.mainCategory} | ${SITE_NAME}`;
}

export function productDescription(product: CatalogItem) {
  return (
    product.description ||
    `${product.model} para ${product.mainCategory.toLowerCase()}, com fabricação própria em São José do Rio Preto (SP). Solicite orçamento técnico com a Hidroconex.`
  );
}

export function productImageAlt(product: CatalogItem) {
  return `${product.model} para ${product.mainCategory.toLowerCase()}`;
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: LEGAL_NAME,
    alternateName: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl(LOGO_PATH),
    email: EMAIL,
    telephone: TELEPHONE,
    taxID: "14.395.617/0001-68",
    foundingDate: FOUNDED_AT,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: TELEPHONE,
      email: EMAIL,
      areaServed: "BR",
      availableLanguage: "Portuguese",
    },
  };
}

function openingHours(dayOfWeek: string | string[], opens: number, closes: number) {
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek,
    opens: formatTime(opens),
    closes: formatTime(closes),
  };
}

export function localBusinessSchema() {
  const { morning, afternoon } = businessHours;
  const mondayToThursday = ["Monday", "Tuesday", "Wednesday", "Thursday"];

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#localbusiness`,
    name: LEGAL_NAME,
    url: SITE_URL,
    image: absoluteUrl(LOGO_PATH),
    logo: absoluteUrl(LOGO_PATH),
    telephone: TELEPHONE,
    email: EMAIL,
    address: {
      "@type": "PostalAddress",
      streetAddress: "R. Monteiro Lobato, 750 - Distrito Industrial Campo Verdi",
      addressLocality: "São José do Rio Preto",
      addressRegion: "SP",
      postalCode: "15076-080",
      addressCountry: "BR",
    },
    // O intervalo de almoço fica de fora para o Google não mostrar "aberto" nesse horário.
    openingHoursSpecification: [
      openingHours(mondayToThursday, morning.start, morning.end),
      openingHours(mondayToThursday, afternoon.start, afternoon.end),
      openingHours("Friday", morning.start, morning.end),
      openingHours("Friday", afternoon.start, afternoon.endFriday),
    ],
    areaServed: { "@type": "Country", name: "Brasil" },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Catálogo Hidroconex",
      url: absoluteUrl("/catalogo"),
      itemListElement: catalogCategories.map((category) => ({
        "@type": "OfferCatalog",
        name: category.seoTitle,
        description: category.description,
        url: absoluteUrl(categoryPath(category)),
      })),
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "pt-BR",
    publisher: {
      "@id": ORGANIZATION_ID,
    },
  };
}

export function faqSchema(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function categoryCollectionSchema(
  category: CatalogCategory | null,
  products: CatalogItem[],
) {
  const path = category ? categoryPath(category) : "/catalogo";

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category ? category.seoTitle : "Catálogo Hidroconex",
    description: category ? category.description : catalogSeo.description,
    url: absoluteUrl(path),
    inLanguage: "pt-BR",
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.slice(0, 24).map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: absoluteUrl(productPath(product)),
        name: product.model,
      })),
    },
  };
}

export function productSchema(product: CatalogItem, image: string) {
  const category = getCategoryMeta(product.categoryId);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.model,
    ...(image.includes("placeholder.svg") ? {} : { image: absoluteUrl(image) }),
    description: productDescription(product),
    category: category
      ? `${category.mainCategory} > ${category.title}`
      : `${product.mainCategory} > ${product.subCategory}`,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    manufacturer: {
      "@id": ORGANIZATION_ID,
    },
    url: absoluteUrl(productPath(product)),
  };
}
