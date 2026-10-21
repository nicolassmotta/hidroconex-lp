import { ReactNode, useEffect, useState } from "react";
import { CatalogContext, type CatalogState } from "@/hooks/useCatalog";
import { CatalogItem, fetchCatalog } from "@/lib/catalog";

interface CatalogProviderProps {
  /** Catálogo gravado no HTML pré-renderizado; garante que a hidratação use os mesmos dados do build. */
  initialProducts?: CatalogItem[];
  children: ReactNode;
}

const CatalogProvider = ({ initialProducts, children }: CatalogProviderProps) => {
  const [state, setState] = useState<CatalogState>(() =>
    initialProducts
      ? { products: initialProducts, isLoading: false, error: null }
      : { products: [], isLoading: true, error: null },
  );

  useEffect(() => {
    let isMounted = true;

    // Com o catálogo do build já na tela, uma falha da API mantém esses dados em vez de
    // trocá-los pelo catálogo estático do bundle.
    fetchCatalog({ fallbackToStatic: !initialProducts })
      .then((products) => {
        if (isMounted) {
          setState({ products, isLoading: false, error: null });
        }
      })
      .catch((error) => {
        if (!isMounted) return;

        setState((current) =>
          current.products.length > 0
            ? { ...current, isLoading: false }
            : {
                products: [],
                isLoading: false,
                error: error instanceof Error ? error.message : "Não foi possível carregar o catálogo.",
              },
        );
      });

    return () => {
      isMounted = false;
    };
  }, [initialProducts]);

  return <CatalogContext.Provider value={state}>{children}</CatalogContext.Provider>;
};

export default CatalogProvider;
