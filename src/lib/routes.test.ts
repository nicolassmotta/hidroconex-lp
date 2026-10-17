import { describe, expect, it } from "vitest";
import { resolveRoute } from "./routes";

describe("resolveRoute", () => {
  it("resolves public routes", () => {
    expect(resolveRoute("/")).toEqual({ name: "home" });
    expect(resolveRoute("/catalogo/")).toEqual({ name: "catalog" });
    expect(resolveRoute("/catalogo/luvas-para-tanques-subterraneos")).toEqual({
      name: "catalog",
      categoryId: "ts-luvas",
    });
    expect(resolveRoute("/produto/rm-luvas-luva-3")).toEqual({
      name: "product",
      slug: "rm-luvas-luva-3",
    });
    expect(resolveRoute("/admin")).toEqual({ name: "admin" });
  });

  it("treats unknown paths as not found instead of rendering the home page", () => {
    expect(resolveRoute("/qualquer-coisa")).toEqual({ name: "not-found" });
    expect(resolveRoute("/catalogo/categoria-inexistente")).toEqual({ name: "not-found" });
    expect(resolveRoute("/produto/a/b")).toEqual({ name: "not-found" });
  });

  it("does not throw on malformed URL encoding", () => {
    expect(resolveRoute("/produto/%E0%A4%A")).toEqual({ name: "not-found" });
  });
});
