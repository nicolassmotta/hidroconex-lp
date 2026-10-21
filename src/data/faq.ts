import { businessHours, formatTime } from "@/data/company";

export interface FaqItem {
  question: string;
  answer: string;
}

const { morning, afternoon } = businessHours;
const morningHours = `das ${formatTime(morning.start)} às ${formatTime(morning.end)}`;

// Respostas só com informações já publicadas no site; alimentam a seção e o JSON-LD FAQPage.
export const faqItems: FaqItem[] = [
  {
    question: "Quais produtos a Hidroconex fabrica?",
    answer:
      "Luvas de aço carbono, niples e niples de redução, juntas de fixação, plugs de vedação e filtros para tanques subterrâneos e reservatórios metálicos, além de peças usinadas sob medida.",
  },
  {
    question: "A Hidroconex fabrica peças sob medida?",
    answer:
      "Sim. Além dos modelos do catálogo, fabricamos peças sob medida. A equipe técnica confirma medida, rosca, pressão e uso final antes da fabricação.",
  },
  {
    question: "Quais materiais são usados?",
    answer:
      "As luvas e conexões são fabricadas em aço carbono, e as luvas para reservatórios metálicos também saem em aço inox. Para outras especificações, consulte a equipe técnica.",
  },
  {
    question: "As peças passam por controle de qualidade?",
    answer:
      "Sim. A fabricação tem controle dimensional e cada peça é conferida antes da entrega ou da coleta.",
  },
  {
    question: "Como solicitar um orçamento?",
    answer:
      "Pelo WhatsApp (17) 99772-6171, pelo formulário de contato do site ou pelo botão \"Solicitar orçamento\" de cada produto do catálogo. Informe o modelo, a quantidade e a aplicação da peça.",
  },
  {
    question: "Vocês enviam para outras cidades?",
    answer:
      "Sim. As peças são enviadas por transportadora, e a retirada também pode ser feita na fábrica em São José do Rio Preto (SP).",
  },
  {
    question: "Qual é o horário de atendimento?",
    answer: `Segunda a quinta, ${morningHours} e das ${formatTime(afternoon.start)} às ${formatTime(afternoon.end)}. Sexta-feira, ${morningHours} e das ${formatTime(afternoon.start)} às ${formatTime(afternoon.endFriday)}.`,
  },
  {
    question: "Onde fica a fábrica?",
    answer:
      "Na R. Monteiro Lobato, 750, Distrito Industrial Campo Verdi, em São José do Rio Preto (SP).",
  },
];
