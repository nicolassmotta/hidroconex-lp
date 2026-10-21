import { createContext, useContext } from "react";
import type { CatalogItem } from "@/lib/catalog";

export interface CatalogState {
  products: CatalogItem[];
  isLoading: boolean;
  error: string | null;
}

export const CatalogContext = createContext<CatalogState>({
  products: [],
  isLoading: true,
  error: null,
});

export function useCatalog() {
  return useContext(CatalogContext);
}
