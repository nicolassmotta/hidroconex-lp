import { useState, useEffect } from "react";
import BrandLogo from "@/components/BrandLogo";

interface HeaderProps {
  /** Na home os links de seção usam só a âncora; nas outras páginas voltam para "/". */
  isHome?: boolean;
}

const Header = ({ isHome = false }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const sectionHref = (hash: string) => (isHome ? hash : `/${hash}`);

  const navItems = [
    { label: "Início", href: sectionHref("#inicio") },
    { label: "Produtos", href: sectionHref("#produtos") },
    { label: "Catálogo", href: "/catalogo" },
    { label: "Sobre", href: sectionHref("#sobre") },
    { label: "Localização", href: sectionHref("#localizacao") },
    { label: "Contato", href: sectionHref("#contato") },
  ];

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled || isMobileMenuOpen
          ? "bg-card/95 shadow-lg backdrop-blur-md"
          : "bg-secondary/15 backdrop-blur-[2px]"
      }`}
    >
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-secondary/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="section-container relative">
        <div className="flex items-center justify-between h-20">
          <a href="/#inicio" className="flex items-center" aria-label="Hidroconex">
            <BrandLogo variant={isScrolled || isMobileMenuOpen ? "dark" : "light"} />
          </a>

          <nav className="hidden md:flex items-center gap-7">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`text-sm font-semibold transition-colors duration-200 ${
                  isScrolled
                    ? "text-foreground/80 hover:text-lime-dark"
                    : "text-secondary-foreground/90 hover:text-primary"
                }`}
              >
                {item.label}
              </a>
            ))}
            <a href={sectionHref("#contato")} className="btn-hero text-sm px-6 py-3">
              Solicitar Orçamento
            </a>
          </nav>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-md border transition-colors ${
              isScrolled || isMobileMenuOpen ? "text-foreground" : "text-secondary-foreground"
            } border-current/20`}
            aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <span
              className={`h-0.5 w-5 bg-current transition-transform ${
                isMobileMenuOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`h-0.5 w-5 bg-current transition-opacity ${
                isMobileMenuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-0.5 w-5 bg-current transition-transform ${
                isMobileMenuOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>

        {isMobileMenuOpen && (
          <nav id="mobile-navigation" className="md:hidden pb-4 animate-fade-in">
            <div className="flex flex-col gap-4 bg-card rounded-lg p-4 shadow-lg">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-foreground/80 hover:text-lime-dark font-medium py-2 transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <a
                href={sectionHref("#contato")}
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn-hero text-center text-sm px-6 py-3 mt-2"
              >
                Solicitar Orçamento
              </a>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
