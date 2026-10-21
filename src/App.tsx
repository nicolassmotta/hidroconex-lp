import { lazy, Suspense, useEffect, type ReactNode } from "react";
import CatalogProvider from "@/components/CatalogProvider";
import type { CatalogItem } from "@/lib/catalog";
import { initFailureMonitoring } from "@/lib/failureMonitoring";
import { resolveRoute } from "@/lib/routes";
import { SeoCollectorContext, type SeoCollector } from "@/lib/seoCollector";

import CatalogPage from "./pages/Catalog";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProductDetail from "./pages/ProductDetail";

const AdminRoute = lazy(() => import("./pages/AdminRoute"));

interface AppProps {
  /** Caminho da página; no navegador vem de window.location, no build vem do prerender. */
  url?: string;
  initialCatalog?: CatalogItem[];
  seoCollector?: SeoCollector | null;
}

const App = ({ url, initialCatalog, seoCollector = null }: AppProps) => {
  const route = resolveRoute(url ?? window.location.pathname);

  useEffect(() => {
    initFailureMonitoring();
  }, []);

  let page: ReactNode;

  if (route.name === "admin") {
    page = (
      <Suspense fallback={null}>
        <AdminRoute />
      </Suspense>
    );
  } else if (route.name === "not-found") {
    page = <NotFound />;
  } else {
    page = (
      <CatalogProvider initialProducts={initialCatalog}>
        {route.name === "home" ? (
          <Index />
        ) : route.name === "catalog" ? (
          <CatalogPage initialCategoryId={route.categoryId} />
        ) : (
          <ProductDetail slug={route.slug} />
        )}
      </CatalogProvider>
    );
  }

  return <SeoCollectorContext.Provider value={seoCollector}>{page}</SeoCollectorContext.Provider>;
};

export default App;
