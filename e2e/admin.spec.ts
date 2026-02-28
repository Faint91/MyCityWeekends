import { test, expect } from '@playwright/test';

test('Admin Panel › can log in and see dashboard', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_ADMIN_EMAIL;
  const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD');
  }

  await page.goto('/admin');

  // Payload admin login tends to have Email/Password fields
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log ?in/i }).click();

  // Assert we landed somewhere authenticated
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});