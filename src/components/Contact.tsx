import { useState, useEffect, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { businessHours, formatTime } from "@/data/company";

const formatDayRange = (afternoonEnd: number) =>
  `${formatTime(businessHours.morning.start)} às ${formatTime(businessHours.morning.end)} | ${formatTime(businessHours.afternoon.start)} às ${formatTime(afternoonEnd)}`;

const horariosAgrupados = [
  { dia: "Segunda a quinta", horas: formatDayRange(businessHours.afternoon.end) },
  { dia: "Sexta-feira", horas: formatDayRange(businessHours.afternoon.endFriday) },
  { dia: "Sábado e domingo", horas: "Fechado" },
];

const contactDetails = [
  {
    label: "Endereço",
    value: (
      <>
        R. Monteiro Lobato, 750
        <br />
        Distrito Ind. Campo Verdi
        <br />
        São José do Rio Preto - SP
      </>
    ),
  },
  {
    label: "Telefone",
    value: (
      <a
        href="https://wa.me/5517997726171?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20Hidroconex!"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-lime-dark transition-colors"
      >
        (17) 99772-6171
      </a>
    ),
  },
  {
    label: "E-mail",
    value: (
      <a
        href="mailto:hidroconex@terra.com.br"
        className="hover:text-lime-dark transition-colors"
      >
        hidroconex@terra.com.br
      </a>
    ),
  },
];

const Contact = () => {
  // null até o navegador calcular: o HTML gerado no build não deve afirmar aberto/fechado.
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
      const day = brTime.getDay();
      const timeInMinutes = brTime.getHours() * 60 + brTime.getMinutes();

      let open = false;

      if (day >= 1 && day <= 5) {
        const { morning, afternoon } = businessHours;
        const isMorningOpen = timeInMinutes >= morning.start && timeInMinutes < morning.end;
        const afternoonClose = day === 5 ? afternoon.endFriday : afternoon.end;
        const isAfternoonOpen = timeInMinutes >= afternoon.start && timeInMinutes < afternoonClose;

        open = isMorningOpen || isAfternoonOpen;
      }

      setIsOpen(open);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="contato" className="section-padding bg-muted">
      <div className="section-container">
        <div className="text-center mb-16">
          <span className="inline-block text-lime-dark font-semibold text-sm uppercase tracking-wider mb-4">
            Fale Conosco
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Entre em <span className="text-lime-dark">contato</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Estamos prontos para atender sua necessidade. Solicite um orçamento
            ou tire dúvidas com a equipe da Hidroconex.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-6">
            <dl className="card-industrial overflow-hidden bg-card">
              {contactDetails.map((item) => (
                <div
                  key={item.label}
                  className="grid gap-2 border-b border-border px-6 py-5 last:border-b-0 sm:grid-cols-[140px_1fr]"
                >
                  <dt className="text-xs font-bold uppercase tracking-[0.2em] text-lime-dark">
                    {item.label}
                  </dt>
                  <dd className="text-foreground/80">{item.value}</dd>
                </div>
              ))}
            </dl>

            <div className="card-industrial p-6">
              <div className="flex-1">
                <h3 className="font-bold text-foreground mb-4">Horário de funcionamento</h3>

                <div className="space-y-3 w-full text-sm">
                  {horariosAgrupados.map((item) => (
                    <div key={item.dia} className="grid gap-1 sm:grid-cols-[max-content_1fr_auto] sm:items-center">
                      <span className="text-muted-foreground sm:whitespace-nowrap">
                        {item.dia}
                      </span>
                      <div className="hidden sm:block mx-2 border-b border-dotted border-muted/30 mb-1" />
                      <span
                        className={`font-medium leading-relaxed ${
                          item.horas === "Fechado"
                            ? "text-muted-foreground/60 italic"
                            : "text-foreground"
                        }`}
                      >
                        {item.horas}
                      </span>
                    </div>
                  ))}
                </div>

                {isOpen === null ? null : isOpen ? (
                  <div className="mt-4 pt-4 border-t border-muted/20 flex items-center gap-2 animate-fade-in">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                    <span className="text-xs font-medium text-green-700 uppercase tracking-wider">
                      Aberto agora
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-muted/20 flex items-center gap-2 animate-fade-in">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500/80" />
                    <span className="text-xs font-medium text-red-700 uppercase tracking-wider">
                      Fechado no momento
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="card-industrial p-5 sm:p-8 relative">
            <h3 className="text-xl font-bold text-foreground mb-6">
              Solicite um orçamento
            </h3>

            <form
              className="space-y-5"
              onSubmit={async (event) => {
                event.preventDefault();
                setIsSubmitting(true);
                setSubmitStatus(null);

                if (!captchaToken) {
                  setSubmitStatus({
                    type: "error",
                    message: "Por favor, preencha o captcha antes de enviar.",
                  });
                  setIsSubmitting(false);
                  return;
                }

                const form = event.currentTarget;
                const formData = new FormData(form);
                const objectData = Object.fromEntries(formData);
                objectData.captchaToken = captchaToken;

                try {
                  const response = await fetch("/api/contact", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Accept: "application/json",
                    },
                    body: JSON.stringify(objectData),
                  });

                  const data = await response.json().catch(() => ({}));

                  if (response.ok) {
                    setSubmitStatus({
                      type: "success",
                      message: "Sua solicitação foi enviada com sucesso. Entraremos em contato em breve.",
                    });
                    form.reset();
                    setCaptchaToken(null);
                    captchaRef.current?.resetCaptcha();
                  } else {
                    setSubmitStatus({
                      type: "error",
                      message:
                        data.error ||
                        data.message ||
                        "Ocorreu um erro ao enviar. Tente novamente ou fale conosco por WhatsApp.",
                    });
                    setCaptchaToken(null);
                    captchaRef.current?.resetCaptcha();
                  }
                } catch {
                  setSubmitStatus({
                    type: "error",
                    message: "Erro de conexão. Verifique sua internet e tente novamente.",
                  });
                  setCaptchaToken(null);
                  captchaRef.current?.resetCaptcha();
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Nome completo
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Seu nome"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="seu@email.com"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="(00) 00000-0000"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                  Mensagem
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  className="w-full px-4 py-3 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                  placeholder="Descreva o que você precisa..."
                  disabled={isSubmitting}
                />
              </div>

              {submitStatus && (
                <div
                  role={submitStatus.type === "error" ? "alert" : "status"}
                  aria-live={submitStatus.type === "error" ? "assertive" : "polite"}
                  aria-atomic="true"
                  className={`form-feedback ${
                    submitStatus.type === "success"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}
                >
                  {submitStatus.message}
                </div>
              )}

              <div className="w-full overflow-x-auto pb-1">
                <div className="min-w-[303px]">
                  <HCaptcha
                    ref={captchaRef}
                    sitekey="50b2fe65-b00b-4b9e-ad62-3ba471098be2"
                    reCaptchaCompat={false}
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-hero py-4 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar solicitação"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
