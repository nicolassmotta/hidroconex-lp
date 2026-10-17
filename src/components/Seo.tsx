import { useContext, useEffect } from "react";
import {
  JSON_LD_SCRIPT_ID,
  resolveSeo,
  seoMetaTags,
  type ResolvedSeo,
  type SeoInput,
} from "@/lib/seo";
import { SeoCollectorContext } from "@/lib/seoCollector";

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function setCanonical(url: string | null) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!url) {
    element?.remove();
    document.head.querySelector('meta[property="og:url"]')?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", url);
}

function setJsonLd(jsonLd: string | null) {
  document.getElementById(JSON_LD_SCRIPT_ID)?.remove();
  if (!jsonLd) return;

  const script = document.createElement("script");
  script.id = JSON_LD_SCRIPT_ID;
  script.type = "application/ld+json";
  script.textContent = jsonLd;
  document.head.appendChild(script);
}

function applySeo(seo: ResolvedSeo) {
  document.title = seo.title;
  setCanonical(seo.canonical);

  for (const tag of seoMetaTags(seo)) {
    setMeta(tag.attribute, tag.key, tag.content);
  }

  const currentJsonLd = document.getElementById(JSON_LD_SCRIPT_ID)?.textContent ?? null;
  if (currentJsonLd !== seo.jsonLd) {
    setJsonLd(seo.jsonLd);
  }
}

export default function Seo(props: SeoInput) {
  const seo = resolveSeo(props);
  const collect = useContext(SeoCollectorContext);

  // Na pré-renderização não há efeitos: as tags vão direto para o HTML gerado.
  collect?.(seo);

  const { title, description, canonical, robots, type, image, imageAlt, jsonLd } = seo;

  useEffect(() => {
    applySeo({ title, description, canonical, robots, type, image, imageAlt, jsonLd });
  }, [title, description, canonical, robots, type, image, imageAlt, jsonLd]);

  return null;
}
