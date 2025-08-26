import { test, expect } from '@playwright/test';

test.describe('Seat Management Application', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('SeatManagement');
  });

  test('should navigate to offices page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Offices');
    await expect(page).toHaveURL(/.*\/offices/);
  });

  test('should navigate to employees page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Employees');
    await expect(page).toHaveURL(/.*\/employees/);
  });

  test('should navigate to floor plans page', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Office assignments');
    await expect(page).toHaveURL(/.*\/floor-plans/);
  });
}); 