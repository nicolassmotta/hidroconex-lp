import { MouseEvent, useEffect, useMemo, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductImageFrame from "@/components/ProductImageFrame";
import Seo from "@/components/Seo";
import WhatsAppButton from "@/components/WhatsAppButton";
import { catalogCategories, getCategoryMeta } from "@/data/categories";
import { useCatalog } from "@/hooks/useCatalog";
import {
  normalizeSearchText,
  productQuoteUrl,
  productSearchText,
  resolveCatalogImage,
} from "@/lib/catalog";
import { resolveRoute } from "@/lib/routes";
import {
  breadcrumbSchema,
  catalogSeo,
  categoryCollectionSchema,
  categorySeoDescription,
  categorySeoTitle,
  organizationSchema,
  productImageAlt,
} from "@/lib/seo";
import { categoryPath, productPath } from "@/lib/siteUrls";

const CATALOG_RESULTS_ID = "catalog-results";
const ALL_CATEGORIES = "todos";

interface CatalogPageProps {
  initialCategoryId?: string;
}

function categoryIdFromLocation() {
  const route = resolveRoute(window.location.pathname);
  return route.name === "catalog" && route.categoryId ? route.categoryId : ALL_CATEGORIES;
}

function isModifiedClick(event: MouseEvent<HTMLAnchorElement>) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

const CatalogPage = ({ initialCategoryId }: CatalogPageProps) => {
  const { products, isLoading, error: loadError } = useCatalog();
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialCategoryId ?? ALL_CATEGORIES,
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Links antigos no formato /catalogo?categoria=<id> passam para a URL própria da categoria.
  useEffect(() => {
    if (initialCategoryId) return;

    const legacyCategory = getCategoryMeta(
      new URLSearchParams(window.location.search).get("categoria") ?? "",
    );
    if (!legacyCategory) return;

    setSelectedCategory(legacyCategory.id);
    window.history.replaceState({}, "", categoryPath(legacyCategory));
  }, [initialCategoryId]);

  useEffect(() => {
    const handlePopState = () => {
      setSelectedCategory(categoryIdFromLocation());
      setSearchTerm("");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm.trim());

    return products.filter((product) => {
      const matchesCategory =
        selectedCategory === ALL_CATEGORIES || product.categoryId === selectedCategory;
      const matchesSearch =
        !normalizedSearch || productSearchText(product).includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [products, searchTerm, selectedCategory]);

  const categoryCounts = useMemo(() => {
    return products.reduce<Record<string, number>>((accumulator, product) => {
      accumulator[product.categoryId] = (accumulator[product.categoryId] || 0) + 1;
      return accumulator;
    }, {});
  }, [products]);

  const selectedCategoryMeta =
    selectedCategory === ALL_CATEGORIES ? null : getCategoryMeta(selectedCategory) ?? null;
  const seoTitle = selectedCategoryMeta ? categorySeoTitle(selectedCategoryMeta) : catalogSeo.title;
  const seoDescription = selectedCategoryMeta
    ? categorySeoDescription(selectedCategoryMeta)
    : catalogSeo.description;
  const seoPath = selectedCategoryMeta ? categoryPath(selectedCategoryMeta) : "/catalogo";
  const breadcrumbs = [
    { name: "Início", path: "/" },
    { name: "Catálogo", path: "/catalogo" },
    ...(selectedCategoryMeta
      ? [{ name: selectedCategoryMeta.seoTitle, path: categoryPath(selectedCategoryMeta) }]
      : []),
  ];

  // Os filtros são links de verdade (rastreáveis); com JS a troca acontece sem recarregar.
  const handleCategoryClick = (event: MouseEvent<HTMLAnchorElement>, categoryId: string) => {
    if (isModifiedClick(event)) return;

    event.preventDefault();
    setSelectedCategory(categoryId);
    setSearchTerm("");

    const category = getCategoryMeta(categoryId);
    window.history.pushState({}, "", category ? categoryPath(category) : "/catalogo");
  };

  const categoryLinkClass = (isActive: boolean) =>
    `whitespace-nowrap rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
      isActive
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-card text-foreground border-border hover:border-primary/50"
    }`;

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={seoTitle}
        description={seoDescription}
        path={seoPath}
        structuredData={[
          organizationSchema(),
          categoryCollectionSchema(selectedCategoryMeta, filteredProducts),
          breadcrumbSchema(breadcrumbs),
        ]}
      />
      <Header />

      <main>
        <section className="bg-gradient-navy text-secondary-foreground pt-32 pb-16">
          <div className="section-container">
            <Breadcrumbs items={breadcrumbs} />

            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-end">
              <div>
                <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
                  {selectedCategoryMeta ? selectedCategoryMeta.mainCategory : "Catálogo Hidroconex"}
                </span>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                  {selectedCategoryMeta
                    ? selectedCategoryMeta.seoTitle
                    : "Catálogo de luvas, niples e conexões industriais"}
                </h1>
                <p className="text-lg text-secondary-foreground/75 max-w-2xl leading-relaxed">
                  {selectedCategoryMeta
                    ? selectedCategoryMeta.description
                    : "Consulte modelos disponíveis para tanques subterrâneos, reservatórios metálicos e aplicações industriais. Para medidas especiais, fale com a equipe técnica."}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                  <p className="text-3xl font-bold text-primary">{products.length}</p>
                  <p className="text-sm text-secondary-foreground/65">produtos listados</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-5">
                  <p className="text-3xl font-bold text-primary">{catalogCategories.length}</p>
                  <p className="text-sm text-secondary-foreground/65">linhas de produto</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="section-container">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between mb-10">
              <div className="relative w-full lg:max-w-md">
                <label htmlFor="catalog-search" className="sr-only">
                  Buscar produtos no catálogo
                </label>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  id="catalog-search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  type="search"
                  placeholder="Buscar por modelo, linha ou aplicação"
                  aria-controls={CATALOG_RESULTS_ID}
                  className="w-full rounded-lg border border-border bg-card pl-12 pr-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <nav
                className="flex gap-2 overflow-x-auto pb-1"
                aria-label="Filtrar catálogo por categoria"
              >
                <a
                  href="/catalogo"
                  onClick={(event) => handleCategoryClick(event, ALL_CATEGORIES)}
                  aria-current={selectedCategory === ALL_CATEGORIES ? "page" : undefined}
                  aria-controls={CATALOG_RESULTS_ID}
                  className={categoryLinkClass(selectedCategory === ALL_CATEGORIES)}
                >
                  Todos ({products.length})
                </a>
                {catalogCategories.map((category) => (
                  <a
                    key={category.id}
                    href={categoryPath(category)}
                    title={category.seoTitle}
                    onClick={(event) => handleCategoryClick(event, category.id)}
                    aria-current={selectedCategory === category.id ? "page" : undefined}
                    aria-controls={CATALOG_RESULTS_ID}
                    className={categoryLinkClass(selectedCategory === category.id)}
                  >
                    {category.shortTitle} ({categoryCounts[category.id] || 0})
                  </a>
                ))}
              </nav>
            </div>

            <div id={CATALOG_RESULTS_ID} aria-live="polite">
              {isLoading ? (
                <div role="status" className="py-20 text-center text-muted-foreground">
                  Carregando catálogo...
                </div>
              ) : loadError ? (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 py-12 px-6 text-center text-red-900"
                >
                  <h2 className="text-xl font-bold mb-2">Não foi possível carregar o catálogo</h2>
                  <p>{loadError}</p>
                </div>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredProducts.map((product) => {
                    const category = getCategoryMeta(product.categoryId);
                    const image = resolveCatalogImage(product);

                    return (
                      <article
                        key={product.id}
                        className="card-industrial flex flex-col overflow-hidden bg-card"
                      >
                        <a href={productPath(product)} aria-label={`Ver detalhes de ${product.model}`}>
                          <ProductImageFrame
                            src={image}
                            alt={productImageAlt(product)}
                            loading="lazy"
                            className="h-56 p-5 transition-colors hover:bg-primary/5"
                          />
                        </a>

                        <div className="flex flex-1 flex-col p-5">
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                            {category?.title || product.subCategory}
                          </span>
                          <a href={productPath(product)} className="group/title">
                            <h2 className="mb-2 text-lg font-bold leading-snug text-foreground transition-colors group-hover/title:text-lime-dark">
                              {product.model}
                            </h2>
                          </a>
                          <p className="text-sm text-muted-foreground flex-1">
                            {product.description ||
                              `${product.mainCategory} • ${product.subCategory}`}
                          </p>

                          <a
                            href={productQuoteUrl(product)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground hover:bg-secondary/90 transition-colors"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Solicitar orçamento
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div
                  role="status"
                  className="rounded-lg border border-dashed border-border bg-card py-16 px-6 text-center"
                >
                  <h2 className="text-xl font-bold text-foreground mb-2">
                    Nenhum produto encontrado
                  </h2>
                  <p className="text-muted-foreground">
                    Ajuste os filtros ou fale com a Hidroconex para uma peça sob medida.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default CatalogPage;
