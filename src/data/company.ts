const toMinutes = (hours: number, minutes: number) => hours * 60 + minutes;

export const formatTime = (totalMinutes: number) =>
  `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;

// Fonte única de horários: alimenta os textos exibidos, o status "aberto agora" e o JSON-LD.
export const businessHours = {
  morning: { start: toMinutes(7, 30), end: toMinutes(11, 30) },
  afternoon: { start: toMinutes(12, 42), end: toMinutes(17, 0), endFriday: toMinutes(16, 0) },
};

// Data de abertura do CNPJ 14.395.617/0001-68 (Receita Federal).
export const FOUNDED_AT = "2011-08-04";

export function companyAgeInYears(now = new Date()) {
  const founded = new Date(`${FOUNDED_AT}T12:00:00-03:00`);
  const hadAnniversary =
    now.getMonth() > founded.getMonth() ||
    (now.getMonth() === founded.getMonth() && now.getDate() >= founded.getDate());

  return now.getFullYear() - founded.getFullYear() - (hadAnniversary ? 0 : 1);
}

export const WHATSAPP_NUMBER = "5517997726171";

export function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
