import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  setup.setTimeout(120_000);
  const username = process.env['PLAYWRIGHT_USERNAME'] || 'ada';
  const password = process.env['PLAYWRIGHT_PASSWORD'] || 'password123';

  await page.goto('http://localhost:4200/login');

  // Mock backend profile endpoint so app can finish initialization without real API
  await page.route('**/api/auth/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        firstName: 'Ada',
        lastName: 'Lovelace',
        subject: 'sub',
        roles: ['user', 'admin'],
        isAdmin: true,
        workingEmail: 'ada@example.com',
        userId: 'uid',
        email: 'ada@example.com',
        username: 'ada'
      })
    });
  });
  // Also mock legacy path if used
  await page.route('**/api/users/profile/roles', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        roles: ['user', 'admin'],
        isAdmin: true
      })
    });
  });
  await page.getByRole('button', { name: 'Login with Azure B2C' }).click();
  await page.getByRole('link').filter({ hasText: /^$/ }).click();
  await page.getByRole('link', { name: 'Demo SPID Gov ID Demo SPID' }).click();

  // Explicitly wait for the navigation to the external login page to complete
  await page.waitForURL('**/demo.spid.gov.it/start**', { timeout: 15000 });
  
  // Now that the page is loaded, fill the credentials
  await page.locator('#username').fill(username);
  await page.locator('#username').press('Tab');
  await page.getByRole('textbox', { name: 'Password' }).fill(password);
  await page.getByRole('button', { name: 'Entra con SPID' }).click();
  await page.getByRole('button', { name: 'Conferma' }).click();

  // Wait for the app to finish initializing and route to dashboard
  await expect(page.getByText('Initializing application...')).toBeHidden({ timeout: 30000 });
  await expect(page).toHaveURL(/.*\/dashboard(\?.*)?$/ , { timeout: 30000 });

  // Save the authentication state to a file
  await page.context().storageState({ path: authFile });
});
