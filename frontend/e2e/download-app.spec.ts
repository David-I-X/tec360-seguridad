import { test, expect } from '@playwright/test';

test.describe('Descargar App', () => {
  test('debe cargar la página de descarga', async ({ page }) => {
    await page.goto('/descargar-app');
    
    // Should show download page content
    const heading = page.getByText(/descargar|instalar|app/i).first();
    await expect(heading).toBeVisible();
  });

  test('debe mostrar enlace de descarga APK', async ({ page }) => {
    await page.goto('/descargar-app');
    
    // Should have a download button/link
    const downloadBtn = page.getByRole('link', { name: /descargar|android|apk/i })
      .or(page.getByRole('button', { name: /descargar|android|apk/i }))
      .first();
    await expect(downloadBtn).toBeVisible();
  });
});
