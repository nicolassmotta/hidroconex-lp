import { catalogCategories, type CatalogCategoryId } from "@/data/categories";

export type AppRoute =
  | { name: "home" }
  | { name: "catalog"; categoryId?: CatalogCategoryId }
  | { name: "product"; slug: string }
  | { name: "admin" }
  | { name: "not-found" };

export function normalizePathname(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/** Mesmas regras no build, no navegador e no vercel.json: rota desconhecida vira 404. */
export function resolveRoute(pathname: string): AppRoute {
  const path = normalizePathname(pathname);

  if (path === "/") return { name: "home" };
  if (path === "/catalogo") return { name: "catalog" };
  if (path === "/admin") return { name: "admin" };

  const categoryMatch = path.match(/^\/catalogo\/([^/]+)$/);
  if (categoryMatch) {
    const slug = safeDecode(categoryMatch[1]);
    const category = catalogCategories.find((item) => item.slug === slug);
    return category ? { name: "catalog", categoryId: category.id } : { name: "not-found" };
  }

  const productMatch = path.match(/^\/produto\/([^/]+)$/);
  if (productMatch) {
    const slug = safeDecode(productMatch[1]);
    return slug ? { name: "product", slug } : { name: "not-found" };
  }

  return { name: "not-found" };
}
