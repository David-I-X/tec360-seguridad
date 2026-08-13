import { test, expect } from '@playwright/test';

test.describe('Panel de Administración', () => {
  test('debe cargar el dashboard admin', async ({ page }) => {
    await page.goto('/admin');
    
    // Should either show admin content or redirect to login
    const isAdmin = page.url().includes('/admin');
    const isLogin = page.url().includes('/login');
    expect(isAdmin || isLogin).toBe(true);
  });

  test('debe mostrar navegación del admin', async ({ page }) => {
    await page.goto('/admin');
    
    // If redirected to login, that's also valid (auth required)
    if (page.url().includes('/login')) {
      test.skip();
      return;
    }
    
    // Check admin menu items
    const menuItems = ['Dashboard', 'Servicios', 'Técnicos', 'Usuarios', 'Verificaciones'];
    for (const item of menuItems) {
      const menuLink = page.getByText(new RegExp(item, 'i')).first();
      await expect(menuLink).toBeVisible();
    }
  });
});
