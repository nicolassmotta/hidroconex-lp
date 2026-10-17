import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Seo from "@/components/Seo";
import WhatsAppButton from "@/components/WhatsAppButton";
import { catalogCategories } from "@/data/categories";
import { categoryPath } from "@/lib/siteUrls";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Página não encontrada | Hidroconex"
        description="O endereço acessado não existe ou foi alterado. Consulte o catálogo de luvas de aço carbono e conexões industriais da Hidroconex."
        path={null}
        robots="noindex,follow"
      />
      <Header />

      <main>
        <section className="bg-gradient-navy pt-32 pb-16 text-secondary-foreground">
          <div className="section-container">
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">
              Erro 404
            </p>
            <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
              Página não encontrada
            </h1>
            <p className="mb-10 max-w-2xl text-lg leading-relaxed text-secondary-foreground/75">
              O endereço acessado não existe ou foi alterado. Veja as linhas de produto abaixo
              ou fale com a equipe técnica da Hidroconex.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="/catalogo" className="btn-hero inline-flex items-center justify-center">
                Ver catálogo de peças
              </a>
              <a href="/" className="btn-secondary-hero inline-flex items-center justify-center">
                Voltar para o início
              </a>
            </div>
          </div>
        </section>

        <section className="section-padding">
          <div className="section-container">
            <h2 className="mb-6 text-2xl font-bold text-foreground">Linhas de produto</h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalogCategories.map((category) => (
                <li key={category.id}>
                  <a
                    href={categoryPath(category)}
                    className="card-industrial block h-full p-5 font-semibold text-foreground transition-colors hover:text-lime-dark"
                  >
                    {category.seoTitle}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default NotFound;
