import { createRoot, hydrateRoot } from "react-dom/client";
import { inject } from "@vercel/analytics";
import "@fontsource-variable/inter";
import "@fontsource-variable/montserrat";
import App from "./App.tsx";
import { CATALOG_SNAPSHOT_ID, type CatalogItem } from "@/lib/catalog";
import "./index.css";

function readCatalogSnapshot(): CatalogItem[] | undefined {
  const element = document.getElementById(CATALOG_SNAPSHOT_ID);
  if (!element?.textContent) return undefined;

  try {
    const products = JSON.parse(element.textContent);
    return Array.isArray(products) ? products : undefined;
  } catch {
    return undefined;
  }
}

const container = document.getElementById("root")!;
const app = <App initialCatalog={readCatalogSnapshot()} />;

// Páginas geradas no build chegam com HTML pronto e só são hidratadas; o app-shell
// (rotas sem HTML pré-renderizado, como /admin) é renderizado do zero.
if (container.firstElementChild) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}

// Vercel Web Analytics: só visualizações de página, sem cookies. O painel /admin fica de fora.
// Se a Vercel expuser a config de observabilidade no build, ela define o caminho do script;
// sem ela vale o padrão /_vercel/insights.
if (import.meta.env.PROD) {
  inject(
    {
      beforeSend: (event) => (new URL(event.url).pathname.startsWith("/admin") ? null : event),
    },
    import.meta.env.VITE_VERCEL_OBSERVABILITY_CLIENT_CONFIG,
  );
}
