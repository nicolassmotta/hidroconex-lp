import { createContext } from "react";
import type { ResolvedSeo } from "@/lib/seo";

export type SeoCollector = (seo: ResolvedSeo) => void;

/**
 * No build (pré-renderização) o <Seo> não roda efeitos: ele entrega as tags para este
 * coletor, que o scripts/prerender.js grava no <head>. No navegador o valor é null.
 */
export const SeoCollectorContext = createContext<SeoCollector | null>(null);
