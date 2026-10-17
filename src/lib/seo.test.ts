import { describe, expect, it } from "vitest";
import { companyAgeInYears } from "@/data/company";
import {
  localBusinessSchema,
  productDescription,
  productSeoTitle,
  renderSeoHead,
  resolveSeo,
  serializeJsonForHtml,
  truncateText,
} from "./seo";

const product = {
  id: "rm-luvas-luva-3-",
  categoryId: "rm-luvas",
  mainCategory: "Reservatórios Metálicos",
  subCategory: "Luvas",
  model: 'Luva 3"',
  description: "",
};

describe("seo helpers", () => {
  it("renders canonical, Open Graph and JSON-LD for a page", () => {
    const head = renderSeoHead(
      resolveSeo({
        title: 'Luva 3" | Hidroconex',
        description: "Descrição",
        path: "/produto/rm-luvas-luva-3",
        structuredData: { "@context": "https://schema.org", "@type": "Product", name: 'Luva 3"' },
      }),
    );

    expect(head).toContain("<title>Luva 3&quot; | Hidroconex</title>");
    expect(head).toContain(
      '<link rel="canonical" href="https://hidroconexluvas.com.br/produto/rm-luvas-luva-3" />',
    );
    expect(head).toContain('<meta property="og:url" content="https://hidroconexluvas.com.br/produto/rm-luvas-luva-3" />');
    expect(head).toContain('<meta property="og:image" content="https://hidroconexluvas.com.br/og-hidroconex.jpg" />');
    expect(head).toContain('<script id="page-json-ld" type="application/ld+json">');
  });

  it("omits canonical and og:url when the path is null", () => {
    const head = renderSeoHead(resolveSeo({ path: null, robots: "noindex,follow" }));

    expect(head).not.toContain('rel="canonical"');
    expect(head).not.toContain("og:url");
    expect(head).toContain('<meta name="robots" content="noindex,follow" />');
  });

  it("keeps admin-provided text from closing the script tag", () => {
    const json = serializeJsonForHtml({ name: "</script><script>alert(1)</script>" });

    expect(json).not.toContain("</script>");
    expect(JSON.parse(json)).toEqual({ name: "</script><script>alert(1)</script>" });
  });

  it("truncates long meta descriptions on a word boundary", () => {
    const text = truncateText("palavra ".repeat(40), 160);

    expect(text.length).toBeLessThanOrEqual(160);
    expect(text.endsWith("palavra…")).toBe(true);
    expect(truncateText("curta", 160)).toBe("curta");
  });

  it("builds product titles and fallback descriptions with application context", () => {
    expect(productSeoTitle(product)).toBe('Luva 3" para Reservatórios Metálicos | Hidroconex');
    expect(productDescription(product)).toContain("para reservatórios metálicos");
    expect(productDescription({ ...product, description: "Texto do admin" })).toBe("Texto do admin");
  });

  it("publishes opening hours without the lunch break", () => {
    const hours = localBusinessSchema().openingHoursSpecification;

    expect(hours).toContainEqual(
      expect.objectContaining({ dayOfWeek: "Friday", opens: "12:42", closes: "16:00" }),
    );
    expect(hours).toContainEqual(
      expect.objectContaining({ opens: "07:30", closes: "11:30" }),
    );
  });

  it("uses the registered postal code for Rua Monteiro Lobato", () => {
    expect(localBusinessSchema().address.postalCode).toBe("15076-080");
  });

  it("counts company age from the CNPJ opening date", () => {
    expect(companyAgeInYears(new Date("2026-08-03T12:00:00-03:00"))).toBe(14);
    expect(companyAgeInYears(new Date("2026-08-04T12:00:00-03:00"))).toBe(15);
  });
});
