import { describe, expect, it, vi } from "vitest";
import {
  fetchCatalog,
  normalizeSearchText,
  productSearchText,
  resolveCatalogImage,
  resolveCatalogThumbnail,
} from "./catalog";

describe("catalog helpers", () => {
  it("normalizes accents and mojibake for search", () => {
    expect(normalizeSearchText("Reservatórios Metálicos")).toBe("reservatorios metalicos");
    expect(normalizeSearchText("ReservatÃ³rios MetÃ¡licos")).toBe("reservatorios metalicos");
  });

  it("builds accent-insensitive product search text", () => {
    const text = productSearchText({
      id: "1",
      categoryId: "rm-luvas",
      mainCategory: "Reservatórios Metálicos",
      subCategory: "Luvas",
      model: "Luva 2\"",
      description: "Peça sob medida",
    });

    expect(text).toContain("reservatorios");
    expect(text).toContain("peca");
  });

  it("resolves static product images to optimized assets or placeholder", () => {
    expect(resolveCatalogImage({ importPath: "" })).toBe("/placeholder.svg");
    expect(
      resolveCatalogImage({
        importPath:
          "./src/assets/Products/Reservatórios Metálicos/Luvas/2. Luva 1-2_/20260203_150703(1).png",
      }),
    ).toMatch(/\.webp$/);
  });

  it("uses the 480px thumbnail for cards and keeps uploads untouched", () => {
    const importPath =
      "./src/assets/Products/Reservatórios Metálicos/Luvas/2. Luva 1-2_/20260203_150703(1).png";

    expect(resolveCatalogThumbnail({ importPath })).toMatch(/ProductsThumbs\/.*\.webp$/);
    expect(resolveCatalogThumbnail({ importPath })).not.toBe(resolveCatalogImage({ importPath }));
    expect(resolveCatalogThumbnail({ imageUrl: "/api/catalog/images/abc", importPath: "" })).toBe(
      "/api/catalog/images/abc",
    );
  });

  it("falls back to the static catalog when the API is unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    const products = await fetchCatalog();

    expect(products.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith("/api/catalog", {
      headers: { Accept: "application/json" },
    });

    vi.unstubAllGlobals();
  });
});
