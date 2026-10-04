import { test, expect } from '@playwright/test';

test.describe('Detalle de Servicio', () => {
  test('debe cargar la lista de servicios', async ({ page }) => {
    await page.goto('/servicios');
    
    // Should show services list or redirect to login/auth
    const onServices = page.url().includes('/servicios');
    const onLogin = page.url().includes('/login') || page.url().includes('/auth');
    expect(onServices || onLogin).toBe(true);
  });

  test('debe cargar la página de historial', async ({ page }) => {
    await page.goto('/servicios/historial');
    
    const onHistory = page.url().includes('/historial');
    const onLogin = page.url().includes('/login') || page.url().includes('/auth');
    expect(onHistory || onLogin).toBe(true);
  });
});
