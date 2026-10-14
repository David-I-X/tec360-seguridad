import { test, expect } from '@playwright/test';

test.describe('Flujo de Autenticación Telefónica con Firebase', () => {
  test('debe cargar la pantalla de teléfono con el contenedor de reCAPTCHA', async ({ page }) => {
    await page.goto('/auth/phone');

    // Verificar título y descripción
    await expect(page.getByText(/ingresa tu número/i)).toBeVisible();
    await expect(page.getByText(/código de verificación por sms/i)).toBeVisible();

    // El contenedor invisible de reCAPTCHA debe existir en el DOM
    const recaptchaContainer = page.locator('#recaptcha-container');
    await expect(recaptchaContainer).toBeAttached();

    // Input de teléfono
    const phoneInput = page.locator('input[type="tel"]');
    await expect(phoneInput).toBeVisible();

    // Botón de enviar código
    const submitBtn = page.getByRole('button', { name: /enviar código/i });
    await expect(submitBtn).toBeVisible();
  });

  test('debe auto-formatear el número colombiano a +57', async ({ page }) => {
    await page.goto('/auth/phone');
    const phoneInput = page.locator('input[type="tel"]');

    // Escribir número sin prefijo internacional
    await phoneInput.fill('3101234567');
    const value = await phoneInput.inputValue();
    expect(value).toBe('+573101234567');
  });

  test('la página de verificación debe redirigir a /auth/phone si no hay número pendiente', async ({ page }) => {
    // Si se accede directamente a /auth/verify sin sessionStorage previo
    await page.goto('/auth/verify');
    await page.waitForURL('**/auth/phone');
    expect(page.url()).toContain('/auth/phone');
  });

  test('la página de verificación debe renderizar el formulario cuando hay un número pendiente en sesión', async ({ page }) => {
    // Simulamos un número pendiente en sessionStorage
    await page.goto('/auth/phone');
    await page.evaluate(() => {
      sessionStorage.setItem('pending_phone', '+573101234567');
    });

    await page.goto('/auth/verify');
    await expect(page.getByText(/verificar código/i)).toBeVisible();
    await expect(page.getByText(/\+57 310 \*\*\* 4567/)).toBeVisible();

    // Input del código OTP de 6 dígitos
    const codeInput = page.locator('input[name="code"]');
    await expect(codeInput).toBeVisible();
  });
});
