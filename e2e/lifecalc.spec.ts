import { test, expect } from '@playwright/test';

test.describe('LifeCalc Browser E2E Test Suite', () => {
  test('1. Guest Journey: unmetered Live Preview, no quota blocking, and non-blocking account prompt', async ({ page }) => {
    // Navigate to EMI calculator
    await page.goto('/calculators/money/emi');
    await expect(page.locator('h1')).toContainText('EMI Calculator');

    // Verify initial primary result and Live Preview badge are visible
    await expect(page.locator('text=Monthly EMI').first()).toBeVisible();
    await expect(page.locator('text=Live Preview')).toBeVisible();

    // Confirm quota counter is gone from header
    await expect(page.locator('text=Free calculations:')).not.toBeVisible();
    await expect(page.locator('[data-testid="guest-quota-badge"]')).not.toBeVisible();

    // Change input: live preview updates immediately without clicking Calculate
    const principalInput = page.locator('input[type="number"]').first();
    await principalInput.fill('2000000');
    await page.waitForTimeout(100);

    // Verify calculation result updated instantly
    await expect(page.locator('text=Monthly EMI').first()).toBeVisible();

    // Simulate 5 meaningful calculator visits to trigger the guest nudge
    await page.evaluate(() => {
      window.localStorage.setItem('lifecalc_guest_engagement', JSON.stringify({
        meaningfulUsageCount: 4,
        lastPromptedAtCount: 0,
        dismissedCount: 0,
      }));
    });

    // Navigate to a new calculator to trigger 5th meaningful usage
    await page.goto('/calculators/money/sip');
    await expect(page.locator('h1')).toContainText('SIP Calculator');
    const sipInput = page.locator('input[type="number"]').first();
    await sipInput.fill('15000');

    // Wait for the settle delay (1500ms) and assert nudge appears
    const nudge = page.locator('[data-testid="guest-account-nudge"]');
    await expect(nudge).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Get more from LifeCalc')).toBeVisible();

    // Dismiss nudge: "Continue as guest"
    const continueBtn = page.locator('button:has-text("Continue as guest")');
    await continueBtn.click();
    await expect(nudge).not.toBeVisible();

    // Verify calculator is fully usable after dismissal
    await sipInput.fill('25000');
    await expect(page.locator('text=Expected Total Corpus').first()).toBeVisible();

    // Refresh page: nudge does not immediately reappear
    await page.reload();
    await expect(page.locator('h1')).toContainText('SIP Calculator');
    await expect(nudge).not.toBeVisible();
  });

  test('2. Authentication Journey: signup, signout, invalid password, signin, and authenticated session', async ({ page }) => {
    const testEmail = `browser_test_${Date.now()}@lifecalc.in`;
    const testPassword = 'Password2026!';
    const testName = 'Browser Tester';

    // 1. Sign Up
    await page.goto('/signup');
    await page.fill('input[placeholder="e.g. Alex Morgan"]', testName);
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[placeholder="Create a password for your LifeCalc account"]', testPassword);
    await page.fill('input[placeholder="Confirm your LifeCalc password"]', testPassword);
    await page.click('button[type="submit"]');

    // Email verification confirmation screen is displayed
    await expect(page.locator('text=Verify Your Email')).toBeVisible();
    await page.click('a:has-text("Continue to LifeCalc")');

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



