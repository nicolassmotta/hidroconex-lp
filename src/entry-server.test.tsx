// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NOT_FOUND_PATH, render, staticCatalog } from "./entry-server";

const catalog = staticCatalog();

describe("server rendering", () => {
  it("renders a product page with its own head and content", () => {
    const { appHtml, headHtml } = render("/produto/rm-luvas-luva-3", catalog);

    expect(headHtml).toContain("<title>Luva 3&quot; para Reservatórios Metálicos | Hidroconex</title>");
    expect(headHtml).toContain('href="https://hidroconexluvas.com.br/produto/rm-luvas-luva-3"');
    expect(headHtml).toContain('"@type":"Product"');
    expect(headHtml).toContain('"@type":"BreadcrumbList"');
    expect(appHtml).toContain("<h1");
    expect(appHtml).toContain("Luva 3&quot;");
    expect(appHtml).toContain('href="/catalogo/luvas-de-aco-para-reservatorios-metalicos"');
  });

  it("renders category pages with crawlable product and filter links", () => {
    const { appHtml, headHtml } = render("/catalogo/luvas-para-tanques-subterraneos", catalog);

    expect(headHtml).toContain(
      "<title>Luvas de Aço Carbono para Tanques Subterrâneos | Hidroconex</title>",
    );
    expect(appHtml).toContain('href="/produto/ts-luvas-luva-2-300lbs"');
    expect(appHtml).toContain('href="/catalogo/niples-para-reservatorios-metalicos"');
    expect(appHtml).not.toContain('href="/produto/rm-luvas-luva-3"');
  });

  it("renders the home page with business structured data", () => {
    const { appHtml, headHtml } = render("/", catalog);

    expect(headHtml).toContain('href="https://hidroconexluvas.com.br/"');
    expect(headHtml).toContain('"@type":"LocalBusiness"');
    expect(headHtml).toContain('"@type":"FAQPage"');
    expect(appHtml).toContain("Luvas de aço carbono, conexões e componentes");
    expect(appHtml).toContain("A Hidroconex fabrica peças sob medida?");
  });

  it("renders the 404 page as noindex without canonical", () => {
    const { appHtml, headHtml } = render(NOT_FOUND_PATH, catalog);

    expect(headHtml).toContain('<meta name="robots" content="noindex,follow" />');
    expect(headHtml).not.toContain('rel="canonical"');
    expect(appHtml).toContain("Página não encontrada");
  });

  it("marks unknown products as noindex", () => {
    const { headHtml } = render("/produto/nao-existe", catalog);

    expect(headHtml).toContain('<meta name="robots" content="noindex,follow" />');
    expect(headHtml).not.toContain('rel="canonical"');
  });
});
