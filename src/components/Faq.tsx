import { ChevronDown } from "lucide-react";
import { faqItems } from "@/data/faq";

const Faq = () => {
  return (
    <section id="duvidas" className="section-padding bg-muted">
      <div className="section-container">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <span className="inline-block text-lime-dark font-semibold text-sm uppercase tracking-wider mb-4">
              Dúvidas
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Perguntas <span className="text-lime-dark">frequentes</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              O que os clientes mais perguntam sobre fabricação, orçamento e entrega das luvas
              e conexões Hidroconex. Não achou sua resposta? Fale com a equipe técnica.
            </p>
            <a href="#contato" className="btn-hero mt-8 inline-flex items-center justify-center">
              Falar com a equipe
            </a>
          </div>

          {/* <details> funciona sem JavaScript e deixa as respostas no HTML indexável. */}
          <div className="space-y-3">
            {faqItems.map((item) => (
              <details key={item.question} className="group card-industrial bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  <h3 className="text-base">{item.question}</h3>
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-lime-dark transition-transform group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="px-5 pb-5 leading-relaxed text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Faq;
