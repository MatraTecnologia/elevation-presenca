import "dotenv/config";
import { test, expect } from "@playwright/test";

test("abre e reabre o cadastro de participante", async ({ page }) => {
  const origin = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width: 1910, height: 914 });
  const login = await page.request.post("/api/auth/sign-in/email", { headers: { Origin: origin }, data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
  expect(login.status(), login.ok() ? "" : await login.text()).toBe(200);
  await page.goto("/");
  const button = page.getByRole("button", { name: "Nova participante", exact: true });
  await expect(button).toBeEnabled();
  await button.click();
  const dialog = page.getByRole("dialog", { name: "Nova participante", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Nova participante", exact: true })).toBeVisible();
  await expect.poll(async () => (await dialog.boundingBox())?.height || 0).toBeGreaterThan(350);
  await expect.poll(async () => {
    const bounds = await dialog.boundingBox();
    const viewport = page.viewportSize()!;
    return bounds ? Math.max(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2), Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2)) : Infinity;
  }).toBeLessThan(3);
  await expect(dialog.getByRole("textbox", { name: "Nome completo", exact: true })).toBeFocused();
  await page.screenshot({ path: "test-results/dialog-participante.png", fullPage: true });
  await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await button.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  for (const viewport of [{ width: 820, height: 1180 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await button.click();
    await expect(dialog.getByRole("heading", { name: "Nova participante", exact: true })).toBeVisible();
    await expect.poll(async () => (await dialog.boundingBox())?.height || 0).toBeGreaterThan(350);
    await expect.poll(async () => {
      const bounds = await dialog.boundingBox();
      return bounds ? Math.max(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2), Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2)) : Infinity;
    }).toBeLessThan(3);
    await dialog.getByRole("textbox", { name: "Nome completo", exact: true }).fill("Conferindo o formulário");
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }
  await page.context().setOffline(true);
  await expect(page.getByText("Sem conexão", { exact: true })).toBeVisible();
  await expect(button).toBeEnabled();
  await button.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("textbox", { name: "Nome completo", exact: true }).fill("Cadastro preparado sem conexão");
  await page.keyboard.press("Escape");
  await page.context().setOffline(false);
  expect(errors).toEqual([]);
});
