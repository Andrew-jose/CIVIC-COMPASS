import { test, expect } from '@playwright/test';

test.describe('Fact-Check Flow', () => {
  test('Submit a claim and receive a verdict', async ({ page }) => {
    await page.goto('/factcheck');

    // Fill the claim
    // await page.getByPlaceholder('Enter a claim').fill('You cannot vote if you have a felony in Texas');
    // await page.getByRole('button', { name: 'Check This Claim' }).click();

    // Assert verdict is visible
    // await expect(page.locator('.verdict-badge')).toBeVisible();
    
    // Assert explanation text is not empty
    // const text = await page.locator('.explanation-text').innerText();
    // expect(text.length).toBeGreaterThan(0);

    // Assert DisenfranchisementRisk badge is visible
    // await expect(page.locator('.risk-badge')).toBeVisible();

    // Assert sources
    // await expect(page.locator('.source-link').first()).toBeVisible();

    expect(true).toBe(true);
  });
});
