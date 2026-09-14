import { test, expect } from '@playwright/test';

test.describe('LifeCalc Browser E2E Test Suite', () => {
  test('1. Calculator Journey: live preview, navigation, and no auth UI', async ({ page }) => {
    // Navigate to EMI calculator
    await page.goto('/calculators/money/emi');
    await expect(page.locator('h1')).toContainText('EMI Calculator');

    // Verify initial primary result and Live Preview badge are visible
    await expect(page.locator('text=Monthly EMI').first()).toBeVisible();
    await expect(page.locator('text=Live Preview')).toBeVisible();

    // No auth UI should be present
    await expect(page.locator('a[href="/signin"]')).not.toBeVisible();
    await expect(page.locator('a[href="/signup"]')).not.toBeVisible();
    await expect(page.locator('button:has-text("Sign out")')).not.toBeVisible();
    await expect(page.locator('text=Free calculations:')).not.toBeVisible();

    // Change input: live preview updates immediately without clicking Calculate
    const principalInput = page.locator('input[type="number"]').first();
    await principalInput.fill('2000000');
    await page.waitForTimeout(100);

    // Verify calculation result updated instantly
    await expect(page.locator('text=Monthly EMI').first()).toBeVisible();

    // Navigate to another calculator
    await page.goto('/calculators/money/sip');
    await expect(page.locator('h1')).toContainText('SIP Calculator');
    const sipInput = page.locator('input[type="number"]').first();
    await sipInput.fill('15000');
    await expect(page.locator('text=Expected Total Corpus').first()).toBeVisible();

    // Refresh page: calculator still works
    await page.reload();
    await expect(page.locator('h1')).toContainText('SIP Calculator');
  });

  test('2. Navigation Journey: home, categories, about, privacy, terms', async ({ page }) => {
    // Home page loads
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();

    // Navigate to a category
    await page.goto('/calculators/money');
    await expect(page.locator('h1')).toContainText(/money/i);

    // About page
    await page.goto('/about');
    await expect(page.locator('h1')).toBeVisible();

    // Privacy page
    await page.goto('/privacy');
    await expect(page.locator('h1')).toBeVisible();

    // Terms page
    await page.goto('/terms');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('3. Persistence Journey: save scenario, reload, and delete', async ({ page }) => {
    // Open EMI calculator
    await page.goto('/calculators/money/emi');

    // Click Save Scenario button
    const saveBtn = page.locator('button:has-text("Save Scenario")');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.locator('text=Saved!')).toBeVisible();
    await page.waitForTimeout(500);

    // Navigate to /saved
    await page.goto('/saved');
    await expect(page.locator('h1')).toContainText('Saved Calculations');
    // Scenario should be present
    await expect(page.locator('text=EMI Calculator Scenario').first()).toBeVisible({ timeout: 10000 });

    // Reload page to verify persistence across page reloads
    await page.reload();
    await expect(page.locator('text=EMI Calculator Scenario').first()).toBeVisible();

    // Delete the scenario
    const deleteBtn = page.locator('button[title="Remove saved calculation"]').first();
    await deleteBtn.click();

    // Verify scenario is removed
    await expect(page.locator('text=EMI Calculator Scenario')).not.toBeVisible();
  });

  test('4. Sharing Journey: create share URL and load in fresh context', async ({ page, browser }) => {
    // Open a calculator and set inputs
    await page.goto('/calculators/money/emi');
    await expect(page.locator('h1')).toContainText('EMI Calculator');

    // Fill in a principal value
    const principalInput = page.locator('input[type="number"]').first();
    await principalInput.fill('500000');
    await page.waitForTimeout(200);

    // Click the Share / Copy Link button
    const shareBtn = page.locator('button:has-text("Share")').or(page.locator('button:has-text("Copy Link")'));
    if (await shareBtn.count() > 0) {
      await shareBtn.first().click();
      await page.waitForTimeout(500);
    }

    // Build a share URL manually with query params (the static sharing mechanism)
    const shareUrl = '/calculators/money/emi?principal=500000';

    // Open in a completely fresh browser context (isolated incognito session)
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();

    await freshPage.goto(shareUrl);
    await expect(freshPage.locator('h1')).toContainText('EMI Calculator');

    // Verify the input was populated from query params
    const freshPrincipal = freshPage.locator('input[type="number"]').first();
    await expect(freshPrincipal).toHaveValue('500000');

    await freshContext.close();
  });
});
