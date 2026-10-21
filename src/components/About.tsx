import { companyAgeInYears } from "@/data/company";

const stats = [
  { value: "01", label: "Leitura da aplicação", detail: "Entendimento de medida, rosca, pressão e uso final." },
  { value: "02", label: "Fabricação e usinagem", detail: "Processo próprio com controle dimensional." },
  { value: "03", label: "Conferência", detail: "Peças revisadas antes da entrega ou coleta." },
  { value: "04", label: "Reposição", detail: "Modelos recorrentes organizados no catálogo." },
];

const About = () => {
  return (
    <section id="sobre" className="section-padding bg-background">
      <div className="section-container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider mb-4">
              Sobre Nós
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Tradição e <span className="text-primary">inovação</span> em
              luvas de aço carbono e conexões industriais
            </h2>

            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p suppressHydrationWarning>
                A <strong className="text-foreground">Hidroconex Indústria e Comércio Ltda</strong> é
                uma fabricante estabelecida na região de São José do Rio Preto há {companyAgeInYears()} anos,
                especializada na produção de luvas de aço carbono, conexões e componentes industriais.
              </p>
              <p>
                Com uma equipe qualificada e equipamentos modernos, desenvolvemos soluções
                que atendem às especificações do mercado industrial. Nossa missão é fornecer
                produtos que garantam a segurança e eficiência das operações de nossos clientes.
              </p>
              <p>
                Cada peça fabricada pela Hidroconex passa por controle de qualidade,
                assegurando durabilidade, precisão e performance para o setor industrial.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-foreground">Aço carbono</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-foreground">Atendimento técnico</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-foreground">Peças sob medida</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm text-foreground">Envio por transportadora</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="border-l-2 border-primary bg-card p-6 shadow-card"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <p className="text-sm font-bold tracking-[0.22em] text-primary mb-4">
                  {stat.value}
                </p>
                <p className="text-lg font-bold text-foreground mb-2">{stat.label}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
