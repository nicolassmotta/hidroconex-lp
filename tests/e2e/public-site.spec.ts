import { expect, test } from "@playwright/test";

test("public pages render and catalog search filters products", async ({ page }) => {
  await page.route("**/api/catalog", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        products: [
          {
            id: "rm-luvas-luva-2",
            categoryId: "rm-luvas",
            mainCategory: "Reservatórios Metálicos",
            subCategory: "Luvas",
            model: "Luva 2\"",
            importPath:
              "./src/assets/Products/Reservatórios Metálicos/Luvas/7. Luva 2_/20260203_145643(1).png",
            description: "",
          },
        ],
      }),
    });
  });
  await page.route("**/api/config", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ imageLimitMb: 3 }) });
  });
  await page.route("**/api/admin/session", async (route) => {
    await route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: "Sessão inválida." }) });
  });

  await page.goto("/");
  await expect(page).toHaveTitle(/Hidroconex/);
  await expect(page.getByRole("heading", { level: 1, name: /conexões/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /catálogo/i }).first()).toBeVisible();

  await page.goto("/catalogo");
  await expect(page.getByRole("heading", { name: /catálogo de luvas/i })).toBeVisible();

  const search = page.getByRole("searchbox", { name: /buscar produtos/i });
  await search.fill("reservatorio");
  await expect(page.getByText(/luva/i).first()).toBeVisible();

  await page.goto("/catalogo?categoria=invalida");
  await expect(page.getByRole("heading", { name: /catálogo de luvas/i })).toBeVisible();
  await expect(page.getByText("Luva 2\"").first()).toBeVisible();

  await page.goto("/catalogo?categoria=rm-luvas");
  await expect(page).toHaveURL(/\/catalogo\/luvas-de-aco-para-reservatorios-metalicos$/);

  await page.goto("/catalogo/luvas-de-aco-para-reservatorios-metalicos");
  await expect(page.getByRole("heading", { level: 1, name: /luvas de aço para reservatórios/i })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://hidroconexluvas.com.br/catalogo/luvas-de-aco-para-reservatorios-metalicos",
  );

  await page.goto("/produto/rm-luvas-luva-2");
  await expect(page.getByRole("heading", { level: 1, name: /luva 2/i })).toBeVisible();
  await expect(page).toHaveTitle('Luva 2" para Reservatórios Metálicos | Hidroconex');

  await page.goto("/pagina-que-nao-existe");
  await expect(page.getByRole("heading", { name: /página não encontrada/i })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,follow");

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /painel hidroconex/i })).toBeVisible();
});

test("authenticated admin renders monitoring and catalog controls", async ({ page }) => {
  await page.route("**/api/config", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ imageLimitMb: 3, modelMaxLength: 120, descriptionMaxLength: 1000 }),
    });
  });

  await page.route("**/api/admin/session", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.route("**/api/admin/failures**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ttlDays: 14,
        count24h: 1,
        count7d: 1,
        lastFailureAt: "2026-07-15T12:00:00.000Z",
        events: [
          {
            id: "failure-1",
            source: "api",
            severity: "error",
            type: "exception",
            method: "POST",
            route: "/api/contact",
            statusCode: 500,
            message: "Falha simulada no contato",
            createdAt: "2026-07-15T12:00:00.000Z",
          },
        ],
      }),
    });
  });

  await page.route(/\/api\/catalog(\?|$)/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        products: [
          {
            id: "ts-luvas-luva-2",
            categoryId: "ts-luvas",
            mainCategory: "Tanques Subterrâneos",
            subCategory: "Luvas",
            model: "Luva 2\"",
            importPath: "",
            description: "",
            updatedAt: "2026-07-15T12:00:00.000Z",
          },
        ],
      }),
    });
  });

  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: /admin do catálogo/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /saúde do sistema/i })).toBeVisible();
  await expect(page.getByText("Falha simulada no contato")).toBeVisible();
  await expect(page.getByText("Sem foto").first()).toBeVisible();
  await expect(page.getByText("Sem descrição").first()).toBeVisible();

  await page.getByLabel("Modelo").fill('Luva 2"');
  await expect(page.getByText(/já existe um produto parecido/i)).toBeVisible();
});
