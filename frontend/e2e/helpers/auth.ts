import { type Page, expect } from '@playwright/test';

/**
 * Login via OTP flow.
 * In dev mode (SMS_ENABLED=false), the OTP code is always '123456'.
 */
export async function loginWithOTP(
  page: Page,
  phone: string,
  options?: { expectRedirectTo?: string }
) {
  await page.goto('/login');
  
  // Enter phone number
  const phoneInput = page.getByPlaceholder(/tel|celular|número/i)
    .or(page.locator('input[type="tel"]'))
    .first();
  await phoneInput.fill(phone);
  
  // Submit phone
  const sendButton = page.getByRole('button', { name: /enviar|continuar|verificar/i }).first();
  await sendButton.click();
  
  // Wait for OTP input to appear
  const otpInput = page.locator('input[data-testid="otp-input"]')
    .or(page.locator('input[autocomplete="one-time-code"]'))
    .or(page.locator('input[inputmode="numeric"]'))
    .first();
  await expect(otpInput).toBeVisible({ timeout: 10_000 });
  
  // Enter OTP code '123456'
  await otpInput.pressSequentially('123456', { delay: 50 });
  
  // Submit OTP (may auto-submit or need a button click)
  const verifyButton = page.getByRole('button', { name: /verificar|confirmar|ingresar/i });
  if (await verifyButton.isVisible()) {
    await verifyButton.click();
  }
  
  // Wait for navigation
  if (options?.expectRedirectTo) {
    await page.waitForURL(options.expectRedirectTo, { timeout: 10_000 });
  } else {
    await page.waitForURL(/(?!.*login).*/, { timeout: 10_000 });
  }
}

/**
 * Check if user is logged in by verifying auth-related elements.
 */
export async function expectLoggedIn(page: Page) {
  // Should not be on login page
  expect(page.url()).not.toContain('/login');
}
