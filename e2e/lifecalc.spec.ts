import { test, expect } from '@playwright/test';

test.describe('LifeCalc Browser E2E Test Suite', () => {
  test('1. Guest Journey: interactive UI calculation, quota banner after 15, and sign-in path', async ({ page }) => {
    // Navigate to EMI calculator
    await page.goto('/calculators/money/emi');
    await expect(page.locator('h1')).toContainText('EMI Calculator');

    // Verify initial primary result is visible
    await expect(page.locator('text=Monthly EMI').first()).toBeVisible();

    // Verify form input and action button exist
    const principalInput = page.locator('input[type="number"]').first();
    await expect(principalInput).toBeVisible();
    const calculateBtn = page.locator('button:has-text("Calculate & Verify")');
    await expect(calculateBtn).toBeVisible();

    // Perform interactive UI calculations
    for (let i = 1; i <= 3; i++) {
      await principalInput.fill(`${1000000 + i * 50000}`);
      await calculateBtn.click();
      await page.waitForTimeout(100);
    }

    // Complete calculations 4 through 15 using context fetch
    for (let i = 4; i <= 15; i++) {
      await page.evaluate(async (count) => {
        await fetch('/api/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            calculatorId: 'emi',
            inputs: { principal: 1000000 + count * 1000, annualRate: 9, tenureYears: 5 },
          }),
        });
      }, i);
    }

    // Now trigger the 15th/16th calculation through the interactive UI button
    await principalInput.fill('2500000');
    await calculateBtn.click();

    // Assert that the friendly Guest Quota Conversion Prompt is rendered directly in the UI
    const quotaBanner = page.locator('text=You’ve completed your 15 free guest calculations!');
    await expect(quotaBanner).toBeVisible({ timeout: 5000 });

    // Verify signin link inside the quota prompt is accessible
    const promptSignInBtn = page.locator('a[href="/signin"]:has-text("Sign in")').first();
    await expect(promptSignInBtn).toBeVisible();

    // Click through to verify navigation works seamlessly
    await promptSignInBtn.click();
    await expect(page).toHaveURL(/.*\/signin/);
    await expect(page.locator('h1')).toContainText('Welcome back to LifeCalc');
  });

  test('2. Authentication Journey: signup, signout, invalid password, signin, and authenticated session', async ({ page }) => {
    const testEmail = `browser_test_${Date.now()}@lifecalc.in`;
    const testPassword = 'Password2026!';
    const testName = 'Browser Tester';

    // 1. Sign Up
    await page.goto('/signup');
    await page.fill('input[placeholder="Your full name"]', testName);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Verify user is authenticated in header
    await page.waitForSelector(`text=${testName}`, { timeout: 10000 });
    await expect(page.locator(`text=${testName}`)).toBeVisible();

    // 2. Sign Out
    await page.click('button:has-text("Sign out")');
    await page.waitForSelector('a[href="/signin"]');
    // Verify user name is gone and Sign in button is back
    await expect(page.locator('a[href="/signin"]').first()).toBeVisible();

    // 3. Sign In - Invalid Password
    await page.goto('/signin');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'WrongPass!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email or password')).toBeVisible();

    // 4. Sign In - Unknown Email
    await page.fill('input[type="email"]', `unknown_${Date.now()}@lifecalc.in`);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email or password')).toBeVisible();

    // 5. Sign In - Correct Credentials
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForSelector(`text=${testName}`, { timeout: 10000 });
    await expect(page.locator(`text=${testName}`)).toBeVisible();

    // 6. Session persists across navigation
    await page.goto('/calculators/money/sip');
    await expect(page.locator(`text=${testName}`)).toBeVisible();

    // 7. Sign Out again
    await page.click('button:has-text("Sign out")');
    await page.waitForSelector('a[href="/signin"]');
    await expect(page.locator('a[href="/signin"]').first()).toBeVisible();
  });

  test('3. Persistence Journey: save scenario, reload, and delete', async ({ page }) => {
    // Open EMI calculator
    await page.goto('/calculators/money/emi');

    // Click Save Scenario button
    const saveBtn = page.locator('button:has-text("Save Scenario")');
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();
    await expect(page.locator('text=Saved!')).toBeVisible();

    // Navigate to /saved
    await page.goto('/saved');
    await expect(page.locator('h1')).toContainText('Saved Calculations');
    // Scenario should be present
    await expect(page.locator('text=EMI Calculator Scenario').first()).toBeVisible();

    // Reload page to verify persistence across page reloads
    await page.reload();
    await expect(page.locator('text=EMI Calculator Scenario').first()).toBeVisible();

    // Delete the scenario
    const deleteBtn = page.locator('button[title="Remove saved calculation"]').first();
    await deleteBtn.click();

    // Verify scenario is removed
    await expect(page.locator('text=EMI Calculator Scenario')).not.toBeVisible();
  });

  test('4. Sharing Journey: create share link and load in fresh context', async ({ page, browser }) => {
    // 1. Create a shareable calculation via API with specific inputs
    const shareRes = await page.request.post('/api/share', {
      data: {
        calculatorId: 'can-i-afford-this',
        inputs: {
          monthlyIncome: 95000,
          monthlyExpenses: 35000,
          existingEmis: 5000,
          currentSavings: 300000,
          itemPrice: 75000,
          paymentMode: 'cash',
          downPayment: 75000,
          emiTenureMonths: 12,
          emiInterestRate: 0,
        },
      },
    });
    expect(shareRes.ok()).toBeTruthy();
    const { shareId, shareUrl } = await shareRes.json();
    expect(shareId).toBeTruthy();

    // 2. Open in a completely fresh browser context (isolated incognito session)
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();

    await freshPage.goto(shareUrl);
    // Verify shared banner and correct calculator loaded
    await expect(freshPage.locator('h1')).toContainText('Shared Calculation: Can I Afford This?');
    await expect(freshPage.locator('text=Verified Engine Result')).toBeVisible();

    await freshContext.close();
  });
});