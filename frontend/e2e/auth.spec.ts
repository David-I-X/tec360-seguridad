import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test('debe mostrar la página de login', async ({ page }) => {
    await page.goto('/login');
    
    // Should see phone input
    const phoneInput = page.locator('input[type="tel"]')
      .or(page.getByPlaceholder(/tel|celular|número/i))
      .first();
    await expect(phoneInput).toBeVisible();
  });

  test('debe validar número de teléfono vacío', async ({ page }) => {
    await page.goto('/login');
    
    const submitBtn = page.getByRole('button', { name: /enviar|continuar|verificar/i }).first();
    await submitBtn.click();
    
    // Should show some validation error or remain on page
    await expect(page).toHaveURL(/login/);
  });

  test('debe mostrar campo de OTP después de enviar teléfono', async ({ page }) => {
    await page.goto('/login');
    
    const phoneInput = page.locator('input[type="tel"]')
      .or(page.getByPlaceholder(/tel|celular|número/i))
      .first();
    await phoneInput.fill('+573001234567');
    
    const submitBtn = page.getByRole('button', { name: /enviar|continuar|verificar/i }).first();
    await submitBtn.click();
    
    // Should show OTP input
    const otpSection = page.locator('input[inputmode="numeric"]')
      .or(page.getByText(/código|verificación/i))
      .first();
    await expect(otpSection).toBeVisible({ timeout: 10_000 });
  });
});
