// @vitest-environment node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { __test__ } from "./server.js";

describe("server helpers", () => {
  it("keeps health and config independent from MongoDB", () => {
    expect(__test__.routeUsesDatabase("GET", "/api/health")).toBe(false);
    expect(__test__.routeUsesDatabase("GET", "/api/config")).toBe(false);
    expect(__test__.routeUsesDatabase("GET", "/api/ready")).toBe(true);
    expect(__test__.routeUsesDatabase("GET", "/api/catalog")).toBe(true);
    expect(__test__.routeUsesDatabase("POST", "/api/monitoring/failures")).toBe(true);
  });

  it("caches the public catalog at the CDN but not fresh reads", () => {
    const request = (url) => ({ url, headers: { host: "localhost" } });

    expect(__test__.catalogCacheControl(request("/api/catalog"))).toContain("s-maxage=60");
    expect(__test__.catalogCacheControl(request("/api/catalog?fresh=1"))).toBe("no-store");
  });

  it("validates product payloads", () => {
    expect(
      __test__.validateProductPayload({
        categoryId: "rm-luvas",
        model: " Luva 2 ",
        description: "Produto técnico",
      }),
    ).toMatchObject({ ok: true });

    expect(
      __test__.validateProductPayload({ categoryId: "invalida", model: "Teste" }),
    ).toMatchObject({ ok: false });
  });

  it("validates contact payloads", () => {
    expect(
      __test__.validateContactPayload({
        name: "Nicolas",
        phone: "(17) 99999-9999",
        email: "nicolas@example.com",
        message: "Preciso de orçamento",
        captchaToken: "token",
      }),
    ).toMatchObject({ ok: true });

    expect(
      __test__.validateContactPayload({
        name: "Nicolas",
        phone: "(17) 99999-9999",
        email: "email-invalido",
        message: "Preciso de orçamento",
        captchaToken: "token",
      }),
    ).toMatchObject({ ok: false });
  });

  it("detects supported image signatures and rejects invalid base64", () => {
    const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
    const jpg = Buffer.from("ffd8ffe000104a464946", "hex");
    const webp = Buffer.from("524946461a00000057454250", "hex");

    expect(__test__.detectImageType(png)).toMatchObject({ contentType: "image/png" });
    expect(__test__.detectImageType(jpg)).toMatchObject({ contentType: "image/jpeg" });
    expect(__test__.detectImageType(webp)).toMatchObject({ contentType: "image/webp" });
    expect(() => __test__.decodeBase64Image("not base64")).toThrow("Imagem inválida.");
  });

  it("validates frontend failure reports", () => {
    expect(
      __test__.validateFailurePayload({
        source: "frontend",
        message: "Erro no catálogo",
        route: "/catalogo",
        stack: "stack".repeat(800),
      }),
    ).toMatchObject({ ok: true });

    expect(__test__.validateFailurePayload({ message: "" })).toMatchObject({ ok: false });
  });

  it("serves prerendered pages, the app shell and a real 404 like vercel.json", async () => {
    const distDir = await fs.mkdtemp(path.join(os.tmpdir(), "hidroconex-dist-"));
    await fs.mkdir(path.join(distDir, "produto", "luva-3"), { recursive: true });
    await fs.mkdir(path.join(distDir, "catalogo"), { recursive: true });
    await fs.writeFile(path.join(distDir, "index.html"), "home");
    await fs.writeFile(path.join(distDir, "catalogo", "index.html"), "catalogo");
    await fs.writeFile(path.join(distDir, "produto", "luva-3", "index.html"), "luva");
    await fs.writeFile(path.join(distDir, "sitemap.xml"), "<urlset />");

    const resolve = (pathname) => __test__.resolveStaticFile(pathname, distDir);

    try {
      expect(await resolve("/")).toEqual({ filePath: path.join(distDir, "index.html"), statusCode: 200 });
      expect(await resolve("/catalogo/")).toEqual({
        filePath: path.join(distDir, "catalogo", "index.html"),
        statusCode: 200,
      });
      expect(await resolve("/produto/luva-3")).toEqual({
        filePath: path.join(distDir, "produto", "luva-3", "index.html"),
        statusCode: 200,
      });
      expect(await resolve("/sitemap.xml")).toEqual({
        filePath: path.join(distDir, "sitemap.xml"),
        statusCode: 200,
      });
      expect(await resolve("/produto/novo-produto")).toEqual({
        filePath: path.join(distDir, "app-shell.html"),
        statusCode: 200,
      });
      expect(await resolve("/admin")).toEqual({
        filePath: path.join(distDir, "app-shell.html"),
        statusCode: 200,
      });
      expect(await resolve("/pagina-que-nao-existe")).toEqual({
        filePath: path.join(distDir, "404.html"),
        statusCode: 404,
      });
    } finally {
      await fs.rm(distDir, { recursive: true, force: true });
    }
  });
});
