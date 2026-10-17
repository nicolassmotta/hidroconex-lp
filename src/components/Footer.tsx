import BrandLogo from "@/components/BrandLogo";
import { catalogCategories } from "@/data/categories";
import { categoryPath } from "@/lib/siteUrls";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="section-container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div>
            <BrandLogo variant="light" className="mb-5" />
            <p className="text-secondary-foreground/70 max-w-md mb-6">
              Fabricante de luvas de aço carbono, conexões, niples, juntas, plugs
              e filtros para o setor industrial. Qualidade e precisão para sua
              operação.
            </p>
            <div className="flex gap-4">
              <a
                href="https://wa.me/5517997726171?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20Hidroconex!"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
                aria-label="WhatsApp Hidroconex"
              >
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-4">Produtos</h2>
            <nav aria-label="Linhas de produto" className="flex flex-col gap-3">
              {catalogCategories.map((category) => (
                <a
                  key={category.id}
                  href={categoryPath(category)}
                  className="text-sm text-secondary-foreground/70 hover:text-primary transition-colors"
                >
                  {category.seoTitle}
                </a>
              ))}
            </nav>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-4">Links Rápidos</h2>
            <nav className="flex flex-col gap-3">
              <a href="/#inicio" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                Início
              </a>
              <a href="/#produtos" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                Produtos
              </a>
              <a href="/catalogo" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                Catálogo
              </a>
              <a href="/#sobre" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                Sobre Nós
              </a>
              <a href="/#localizacao" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                Localização
              </a>
              <a href="/#contato" className="text-secondary-foreground/70 hover:text-primary transition-colors">
                Contato
              </a>
            </nav>
          </div>

          <div>
            <h2 className="font-bold text-lg mb-4">Contato</h2>
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">Endereço</p>
                <span className="text-secondary-foreground/70 text-sm">
                  R. Monteiro Lobato, 750<br />
                  Distrito Ind. Campo Verdi<br />
                  São José do Rio Preto - SP
                </span>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">Telefone</p>
                <a href="tel:+5517997726171" className="text-secondary-foreground/70 text-sm hover:text-primary transition-colors">
                  (17) 99772-6171
                </a>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">E-mail</p>
                <a href="mailto:hidroconex@terra.com.br" className="text-secondary-foreground/70 text-sm hover:text-primary transition-colors">
                  hidroconex@terra.com.br
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-secondary-foreground/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* O ano vem do build no HTML estático; no navegador ele é recalculado. */}
            <p
              className="text-secondary-foreground/50 text-sm text-center md:text-left"
              suppressHydrationWarning
            >
              © {currentYear} Hidroconex Indústria e Comércio Ltda. Todos os direitos reservados.
            </p>
            <p className="text-secondary-foreground/50 text-sm">
              CNPJ: 14.395.617/0001-68
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
