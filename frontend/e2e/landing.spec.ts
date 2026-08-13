import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('debe cargar la página principal', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/tec360|seguridad/i);
  });

  test('debe mostrar elementos principales', async ({ page }) => {
    await page.goto('/');
    
    // Logo or brand name
    const brand = page.getByText(/tec360/i).first();
    await expect(brand).toBeVisible();
    
    // CTA button to login or download
    const cta = page.getByRole('link', { name: /iniciar|descargar|comenzar/i }).first();
    await expect(cta).toBeVisible();
  });

  test('debe navegar a login', async ({ page }) => {
    await page.goto('/');
    
    const loginLink = page.getByRole('link', { name: /iniciar sesión|ingresar|login/i }).first();
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });
});
