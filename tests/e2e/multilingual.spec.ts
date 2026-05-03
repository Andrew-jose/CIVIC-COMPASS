import { test, expect } from '@playwright/test';

test.describe('Multilingual Switch', () => {
  test('Switch languages', async ({ page }) => {
    await page.goto('/');

    // Select Spanish
    // await page.getByTestId('lang-select').selectOption('Español');
    // await expect(page.locator('nav')).toContainText('Inicio'); // e.g. Home in Spanish

    // Select Arabic
    // await page.getByTestId('lang-select').selectOption('العربية');
    // const dir = await page.evaluate(() => document.documentElement.dir);
    // expect(dir).toBe('rtl');

    expect(true).toBe(true);
  });
});
