import { test, expect } from '@playwright/test';

test('capture all important views', async ({ page }) => {
  const baseUrl = 'http://localhost:3000/formation';

  // 1. Landing
  await page.goto(baseUrl);
  await page.screenshot({ path: 'final_01_landing.png', fullPage: true });

  // 2. Login
  await page.goto(`${baseUrl}/login?filiere=Informatique%20de%20Gestion`);
  await page.screenshot({ path: 'final_02_login.png', fullPage: true });

  // 3. Register
  await page.goto(`${baseUrl}/register?filiere=Informatique%20de%20Gestion`);
  await page.screenshot({ path: 'final_03_register.png', fullPage: true });

  // 4. Admin Login
  await page.goto(`${baseUrl}/nina`);
  await page.screenshot({ path: 'final_04_admin_login.png', fullPage: true });

  // 5. Prof Login
  await page.goto(`${baseUrl}/prof-add`);
  await page.screenshot({ path: 'final_05_prof_login.png', fullPage: true });
});
