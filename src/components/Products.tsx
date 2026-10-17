import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProductImageFrame from "@/components/ProductImageFrame";
import { catalogCategoryGroups, CatalogCategory } from "@/data/categories";
import { useCatalog } from "@/hooks/useCatalog";
import { CatalogItem, resolveCatalogImage } from "@/lib/catalog";
import { categoryPath } from "@/lib/siteUrls";

function getCategoryThumbnail(categoryId: string, products: CatalogItem[]): string {
  const item = products.find((product) => product.categoryId === categoryId);
  return item ? resolveCatalogImage(item) : "/placeholder.svg";
}

const ProductCard = ({
  category,
  image,
  index,
}: {
  category: CatalogCategory;
  image: string;
  index: number;
}) => (
  <a
    href={categoryPath(category)}
    className="card-industrial group flex h-full flex-col overflow-hidden bg-card"
    style={{ animationDelay: `${index * 0.1}s` }}
  >
    <ProductImageFrame
      src={image}
      alt={category.seoTitle}
      className="h-64 w-full p-7"
      imageClassName="transition-transform duration-500 ease-out group-hover:scale-110"
    />
    <div className="flex flex-grow flex-col p-6">
      <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-lime-dark transition-colors">
        {category.title}
      </h3>
      <p className="text-muted-foreground leading-relaxed text-sm flex-grow">
        {category.description}
      </p>

      <div className="mt-5 flex items-center text-muted-foreground group-hover:text-lime-dark font-semibold transition-colors duration-300">
        <span className="text-sm">Ver peças da categoria</span>
        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </div>
  </a>
);

const Products = () => {
  const { products } = useCatalog();

  const categoryCounts = useMemo(() => {
    return products.reduce<Record<string, number>>((accumulator, product) => {
      accumulator[product.categoryId] = (accumulator[product.categoryId] || 0) + 1;
      return accumulator;
    }, {});
  }, [products]);

  // Flex com justify-center: linhas incompletas (ex.: 5 cards em 3 colunas) ficam centradas
  // em vez de deixar um vão à direita.
  const renderCategoryGrid = (categories: CatalogCategory[], itemClass: string) => (
    <div className="flex flex-wrap justify-center gap-6">
      {categories.map((category, index) => (
        <div key={category.id} className={`relative w-full ${itemClass}`}>
          <ProductCard
            category={category}
            image={getCategoryThumbnail(category.id, products)}
            index={index}
          />
          {categoryCounts[category.id] > 0 && (
            <span className="absolute top-4 right-4 z-20 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold px-3 py-1 shadow-md">
              {categoryCounts[category.id]} {categoryCounts[category.id] === 1 ? "item" : "itens"}
            </span>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <section id="produtos" className="section-padding bg-muted">
      <div className="section-container">
        <div className="text-center mb-16">
          <span className="inline-block text-lime-dark font-semibold text-sm uppercase tracking-wider mb-4 animate-fade-in">
            O que fabricamos
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 font-heading tracking-tight">
            Nossos <span className="text-lime-dark">Produtos</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
            Luvas de aço carbono, conexões, niples, juntas, plugs e filtros. Peças técnicas de
            alta precisão para tanques subterrâneos, reservatórios metálicos e aplicações
            industriais sob medida.
          </p>
        </div>

        <Tabs defaultValue="tanques" className="w-full">
          <div className="flex justify-center mb-12">
            <TabsList className="!grid grid-cols-2 items-stretch bg-background border border-border p-1 w-full max-w-[600px] h-auto min-h-[60px] shadow-sm rounded-lg">
              <TabsTrigger
                value="tanques"
                className="h-full min-h-12 !whitespace-normal px-2 text-center text-xs leading-tight sm:text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 rounded-md"
              >
                Tanques Subterrâneos
              </TabsTrigger>
              <TabsTrigger
                value="reservatorios"
                className="h-full min-h-12 !whitespace-normal px-2 text-center text-xs leading-tight sm:text-base font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-300 rounded-md"
              >
                Reservatórios Metálicos
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="tanques" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {renderCategoryGrid(
              catalogCategoryGroups.tanques,
              "md:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)]",
            )}
          </TabsContent>

          <TabsContent value="reservatorios" className="mt-0 focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mx-auto max-w-4xl">
              {renderCategoryGrid(
                catalogCategoryGroups.reservatorios,
                "md:w-[calc(50%-0.75rem)]",
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="text-center mt-16 pt-8 border-t border-border/50">
          <a
            href="/catalogo"
            className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-semibold px-8 py-4 rounded-lg hover:bg-secondary/90 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            Abrir catálogo completo
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default Products;
