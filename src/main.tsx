import { createRoot, hydrateRoot } from "react-dom/client";
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
