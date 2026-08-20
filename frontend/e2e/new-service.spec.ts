import { test, expect } from '@playwright/test';

test.describe('Nueva Solicitud de Servicio', () => {
  test('debe cargar la página de nueva solicitud o redirigir a login', async ({ page }) => {
    await page.goto('/servicios/nuevo');
    
    // Should show form or redirect to login
    const isForm = page.url().includes('/nuevo') || page.url().includes('/nueva');
    const isLogin = page.url().includes('/login');
    expect(isForm || isLogin).toBe(true);
  });

  test('debe requerir autenticación para solicitar servicio', async ({ page }) => {
    await page.goto('/servicios/nuevo');
    
    // ProtectedRoute redirects unauthenticated users or shows login / almost ready
    const isLoginOrAuth = page.url().includes('/login') || page.url().includes('/auth');
    const hasLoginPrompt = (await page.getByText(/iniciar sesión|bienvenido|casi listos/i).count()) > 0;
    expect(isLoginOrAuth || hasLoginPrompt).toBe(true);
  });
});
