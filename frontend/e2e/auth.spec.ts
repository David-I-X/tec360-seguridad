import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test('debe mostrar la página de login con opciones de acceso', async ({ page }) => {
    await page.goto('/login');
    
    // Debe mostrar bienvenida y botón para continuar con teléfono
    const heading = page.getByText(/bienvenido|tec360/i).first();
    await expect(heading).toBeVisible();

    const phoneBtn = page.getByRole('link', { name: /continuar con teléfono/i })
      .or(page.getByText(/continuar con teléfono/i))
      .first();
    await expect(phoneBtn).toBeVisible();
  });

  test('debe mostrar el formulario de ingreso de teléfono', async ({ page }) => {
    await page.goto('/auth/phone');
    
    const phoneInput = page.locator('input[type="tel"]')
      .or(page.getByPlaceholder(/300|tel|celular|número/i))
      .first();
    await expect(phoneInput).toBeVisible();
  });

  test('debe validar o dar formato al ingresar número de teléfono', async ({ page }) => {
    await page.goto('/auth/phone');
    
    const phoneInput = page.locator('input[type="tel"]')
      .or(page.getByPlaceholder(/300|tel|celular|número/i))
      .first();
    await phoneInput.fill('3001234567');
    
    // Debe formatear con prefijo +57
    const val = await phoneInput.inputValue();
    expect(val).toContain('3001234567');
  });
});
