import { test, expect } from '@playwright/test';

test('simple test', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('SeatManagement');
});

test('navigate to offices', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Offices');
  await expect(page).toHaveURL(/.*\/offices/);
});

test('navigate to employees', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Employees');
  await expect(page).toHaveURL(/.*\/employees/);
});

test('navigate to floor plans', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Office assignments');
  await expect(page).toHaveURL(/.*\/floor-plans/);
}); 