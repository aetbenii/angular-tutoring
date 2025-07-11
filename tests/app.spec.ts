import { test, expect } from '@playwright/test';

test.describe('Seat Management Application', () => {
  // Start from the home page because we are already logged in
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the homepage and show dashboard', async ({ page }) => {
    await expect(page).toHaveTitle('SeatManagement');
    await expect(page.locator('app-dashboard')).toBeVisible();
  });

  test('should navigate to offices page', async ({ page }) => {
    await page.click('text=Offices');
    await expect(page).toHaveURL(/.*\/offices/);
  });

  test('should navigate to employees page', async ({ page }) => {
    await page.click('text=Employees');
    await expect(page).toHaveURL(/.*\/employees/);
  });

  test('should navigate to floor plans page', async ({ page }) => {
    await page.click('text=Office assignments');
    await expect(page).toHaveURL(/.*\/floor-plans/);
  });
}); 