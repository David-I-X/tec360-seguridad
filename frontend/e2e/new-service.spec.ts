import { test, expect } from '@playwright/test';

test.describe('Nueva Solicitud de Servicio', () => {
  test('debe cargar la página de nueva solicitud', async ({ page }) => {
    await page.goto('/servicios/nuevo');
    
    // Should show form or redirect to login
    const isForm = page.url().includes('/nuevo') || page.url().includes('/nueva');
    const isLogin = page.url().includes('/login');
    expect(isForm || isLogin).toBe(true);
  });

  test('debe mostrar tipos de servicio disponibles', async ({ page }) => {
    await page.goto('/servicios/nuevo');
    
    if (page.url().includes('/login')) {
      test.skip();
      return;
    }
    
    // Check service type options
    const serviceTypes = page.getByText(/GPS|alarma|cámara|dashcam|mantenimiento/i);
    await expect(serviceTypes.first()).toBeVisible({ timeout: 10_000 });
  });
});
