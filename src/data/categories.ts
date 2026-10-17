export type CatalogCategoryId =
  | "ts-juntas"
  | "ts-luvas"
  | "ts-niples"
  | "ts-plugs"
  | "ts-filtros"
  | "rm-luvas"
  | "rm-niples";

export interface CatalogCategory {
  id: CatalogCategoryId;
  group: "tanques" | "reservatorios";
  title: string;
  /** Nome completo usado em H1, <title> e links internos (o title curto se repete entre linhas). */
  seoTitle: string;
  shortTitle: string;
  mainCategory: string;
  subCategory: string;
  slug: string;
  description: string;
}

export const catalogCategories: CatalogCategory[] = [
  {
    id: "ts-juntas",
    group: "tanques",
    title: "Juntas de Fixação",
    seoTitle: "Juntas de Fixação para Tanques Subterrâneos",
    shortTitle: "Juntas",
    mainCategory: "Tanques Subterrâneos",
    subCategory: "Juntas",
    slug: "juntas-de-fixacao-para-tanques-subterraneos",
    description:
      "Juntas de alto desempenho e vedação segura para tanques de armazenamento subterrâneo.",
  },
  {
    id: "ts-luvas",
    group: "tanques",
    title: "Luvas",
    seoTitle: "Luvas de Aço Carbono para Tanques Subterrâneos",
    shortTitle: "Luvas",
    mainCategory: "Tanques Subterrâneos",
    subCategory: "Luvas",
    slug: "luvas-para-tanques-subterraneos",
    description:
      "Luvas robustas em aço carbono projetadas para segurança em sistemas subterrâneos.",
  },
  {
    id: "ts-niples",
    group: "tanques",
    title: "Niples de Redução",
    seoTitle: "Niples de Redução para Tanques Subterrâneos",
    shortTitle: "Niples",
    mainCategory: "Tanques Subterrâneos",
    subCategory: "Niples",
    slug: "niples-de-reducao-para-tanques-subterraneos",
    description:
      "Diversas medidas em niples de redução e adaptação para interligação de linhas de fluido.",
  },
  {
    id: "ts-plugs",
    group: "tanques",
    title: "Plugs de Vedação",
    seoTitle: "Plugs de Vedação para Tanques Subterrâneos",
    shortTitle: "Plugs",
    mainCategory: "Tanques Subterrâneos",
    subCategory: "Plugs",
    slug: "plugs-de-vedacao-para-tanques-subterraneos",
    description:
      "Plugs usinados para vedação estanque e segura em compartimentos e tubulações.",
  },
  {
    id: "ts-filtros",
    group: "tanques",
    title: "Filtros",
    seoTitle: "Filtros para Tanques Subterrâneos",
    shortTitle: "Filtros",
    mainCategory: "Tanques Subterrâneos",
    subCategory: "Filtros",
    slug: "filtros-para-tanques-subterraneos",
    description:
      "Sistemas de filtragem duráveis para captação de combustíveis e químicos.",
  },
  {
    id: "rm-luvas",
    group: "reservatorios",
    title: "Luvas de Aço",
    seoTitle: "Luvas de Aço para Reservatórios Metálicos",
    shortTitle: "Luvas",
    mainCategory: "Reservatórios Metálicos",
    subCategory: "Luvas",
    slug: "luvas-de-aco-para-reservatorios-metalicos",
    description:
      "Luvas de aço inox e carbono usinadas em alta precisão para reservatórios metálicos.",
  },
  {
    id: "rm-niples",
    group: "reservatorios",
    title: "Niples",
    seoTitle: "Niples para Reservatórios Metálicos",
    shortTitle: "Niples",
    mainCategory: "Reservatórios Metálicos",
    subCategory: "Niples",
    slug: "niples-para-reservatorios-metalicos",
    description:
      "Niples resistentes projetados para suportar pressões exigidas em estruturas de reservação.",
  },
];

export const catalogCategoryGroups = {
  tanques: catalogCategories.filter((category) => category.group === "tanques"),
  reservatorios: catalogCategories.filter((category) => category.group === "reservatorios"),
};

export function getCategoryMeta(categoryId: string) {
  return catalogCategories.find((category) => category.id === categoryId);
}
