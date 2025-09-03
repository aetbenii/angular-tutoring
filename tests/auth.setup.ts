import { test as setup, expect } from '@playwright/test';
import * as path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

setup('authenticate', async ({ page }) => {
  const username = process.env['PLAYWRIGHT_USERNAME'] || 'ada';
  const password = process.env['PLAYWRIGHT_PASSWORD'] || 'password123';

  await page.goto('http://localhost:4200/login');
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

  // Wait for the main application page to load after login to ensure success
  await expect(page.locator('app-dashboard')).toBeVisible({ timeout: 30000 });

  // Save the authentication state to a file
  await page.context().storageState({ path: authFile });
}); 