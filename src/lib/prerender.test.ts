import { describe, expect, it } from "vitest";
import { staticCatalog } from "./catalog";
import {
  buildSitemapXml,
  prerenderPages,
  prerenderRedirects,
  renderRedirectPage,
} from "./prerender";

describe("prerender pages and sitemap", () => {
  const products = staticCatalog().map((product, index) => ({
    ...product,
    updatedAt: index === 0 ? "2026-09-01T12:00:00.000Z" : "2026-06-14T23:06:39.485Z",
  }));

  it("lists home, catalog, every category and every product once", () => {
    const pages = prerenderPages(products);
    const paths = pages.map((page) => page.path);

    expect(paths).toContain("/");
    expect(paths).toContain("/catalogo");
    expect(paths).toContain("/catalogo/luvas-para-tanques-subterraneos");
    expect(paths).toContain("/produto/rm-luvas-luva-3");
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.filter((path) => path.startsWith("/produto/"))).toHaveLength(products.length);
  });

  it("skips duplicate product slugs", () => {
    const pages = prerenderPages([products[0], { ...products[0], id: `${products[0].id}-` }]);

    expect(pages.filter((page) => page.path.startsWith("/produto/"))).toHaveLength(1);
  });

  it("writes lastmod from the catalog and product images", () => {
    const xml = buildSitemapXml(prerenderPages(products));

    expect(xml).toContain("<loc>https://hidroconexluvas.com.br/catalogo</loc>\n    <lastmod>2026-09-01</lastmod>");
    expect(xml).toMatch(/<image:loc>https:\/\/hidroconexluvas\.com\.br\/.+\.webp<\/image:loc>/);
    expect(xml).not.toContain("/admin");
  });

  it("leaves empty categories out of the sitemap", () => {
    const onlyReservatorios = products.filter((product) => product.categoryId.startsWith("rm-"));
    const xml = buildSitemapXml(prerenderPages(onlyReservatorios));

    expect(xml).toContain("/catalogo/luvas-de-aco-para-reservatorios-metalicos");
    expect(xml).not.toContain("/catalogo/filtros-para-tanques-subterraneos");
  });

  it("redirects old slugs of renamed products without hijacking current ones", () => {
    const [first, second] = products;
    const redirects = prerenderRedirects([
      { ...first, previousIds: ["rm-luvas-luva-velha", `${first.id}-`, second.id] },
      second,
    ]);

    expect(redirects).toEqual([{ from: "/produto/rm-luvas-luva-velha", to: `/produto/${first.id.replace(/-+$/, "")}` }]);
  });

  it("renders an instant redirect page with canonical", () => {
    const html = renderRedirectPage("/produto/rm-luvas-luva-3");

    expect(html).toContain('<meta http-equiv="refresh" content="0; url=/produto/rm-luvas-luva-3" />');
    expect(html).toContain('<link rel="canonical" href="https://hidroconexluvas.com.br/produto/rm-luvas-luva-3" />');
  });
});
