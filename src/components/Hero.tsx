import heroImage from "@/assets/AI/hero-industrial.webp";

const heroStats = [
  { value: "14 anos", label: "de fabricação industrial" },
  { value: "100%", label: "produção própria" },
  { value: "+150", label: "clientes atendidos" },
];

const Hero = () => {
  return (
    <section
      id="inicio"
      className="relative min-h-[92vh] flex items-center overflow-hidden bg-secondary"
    >
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Luvas de aço carbono e conexões industriais Hidroconex — fabricação própria"
          // Minúsculo: o React 18 não conhece fetchPriority e avisa no console.
          {...{ fetchpriority: "high" }}
          decoding="async"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(210_50%_12%/.94),hsl(210_50%_16%/.78)_48%,hsl(210_50%_12%/.34))]" />
      </div>

      <div className="relative z-10 section-container py-32 md:py-40">
        <div className="max-w-5xl">
          <p className="mb-7 border-l-2 border-primary pl-4 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Fabricante de luvas e conexões em aço carbono
          </p>

          <h1 className="max-w-4xl text-4xl md:text-6xl lg:text-7xl font-bold text-secondary-foreground leading-[1.02] mb-7">
            Luvas de aço carbono, conexões e componentes para tanques e reservatórios.
          </h1>

          <p className="max-w-2xl text-lg md:text-xl text-secondary-foreground/80 mb-10 leading-relaxed">
            Fabricação própria de luvas, niples, juntas, plugs e filtros em aço
            carbono. Peças seriadas e sob medida para tanques subterrâneos,
            reservatórios metálicos e sistemas industriais.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#contato"
              className="btn-hero inline-flex items-center justify-center"
            >
              Solicitar orçamento técnico
            </a>
            <a
              href="/catalogo"
              className="btn-secondary-hero inline-flex items-center justify-center"
            >
              Ver catálogo de peças
            </a>
          </div>

          <div className="mt-16 grid max-w-3xl grid-cols-1 border-y border-white/20 sm:grid-cols-3">
            {heroStats.map((item) => (
              <div key={item.value} className="py-5 sm:border-r sm:border-white/20 sm:px-6 first:pl-0 last:border-r-0">
                <p className="text-2xl font-bold text-primary">{item.value}</p>
                <p className="mt-1 text-sm text-secondary-foreground/70">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;
