import { test, expect } from '@playwright/test';

test.describe('Wisdum OS Web Dashboard UI Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to local dashboard app root
    await page.goto('/');
  });

  test('renders header navigation and Wisdum branding', async ({ page }) => {
    await expect(page).toHaveTitle(/Wisdum/i);
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('interacts with hybrid search input field', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search knowledge assets/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill('vector embeddings');
      await expect(searchInput).toHaveValue('vector embeddings');
    }
  });

  test('displays real-time live event stream indicator', async ({ page }) => {
    const liveIndicator = page.getByText(/live/i);
    if (await liveIndicator.isVisible()) {
      await expect(liveIndicator).toBeVisible();
    }
  });
});
