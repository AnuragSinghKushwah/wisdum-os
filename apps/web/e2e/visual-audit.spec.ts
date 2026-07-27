import { test, expect } from '@playwright/test';
import * as path from 'node:path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), '../../artifacts/screenshots');

test.describe('Wisdum OS Complete Visual UI Audit', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Visit sign-in and perform quick dev login
    await page.goto('/sign-in');
    const devBtn = page.getByRole('button', { name: /quick dev sign in/i });
    if (await devBtn.isVisible()) {
      await devBtn.click();
      await page.waitForURL('**/dashboard');
    }
  });

  test('capture /dashboard view', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-dashboard.png`, fullPage: true });
  });

  test('capture /knowledge view and modals', async ({ page }) => {
    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-knowledge-base.png`, fullPage: true });

    // Open Add Asset modal
    const addBtn = page.getByRole('button', { name: /add asset/i });
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/02b-knowledge-add-modal.png` });
      await page.getByRole('button', { name: /cancel/i }).click();
    }
  });

  test('capture /opportunities view and suggestion modal', async ({ page }) => {
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-opportunities.png`, fullPage: true });

    const suggestBtn = page.getByRole('button', { name: /suggest content/i });
    if (await suggestBtn.isVisible()) {
      await suggestBtn.click();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/03b-opportunities-modal.png` });
    }
  });

  test('capture /drafts and /published views', async ({ page }) => {
    await page.goto('/drafts');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-drafts.png`, fullPage: true });

    await page.goto('/published');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-published.png`, fullPage: true });
  });

  test('capture /search view and mode tabs', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-search.png`, fullPage: true });
  });

  test('capture /graph visualizer view', async ({ page }) => {
    await page.goto('/graph');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-graph.png`, fullPage: true });
  });

  test('capture /agents and /automations views', async ({ page }) => {
    await page.goto('/agents');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-agents.png`, fullPage: true });

    await page.goto('/automations');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-automations.png`, fullPage: true });
  });

  test('capture /plugins view and manifest validator', async ({ page }) => {
    await page.goto('/plugins');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-plugins.png`, fullPage: true });

    const validateBtn = page.getByRole('button', { name: /validate manifest/i });
    if (await validateBtn.isVisible()) {
      await validateBtn.click();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/10b-plugins-manifest-modal.png` });
    }
  });

  test('capture /settings view and API keys tab', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-settings-profile.png`, fullPage: true });

    const apiTab = page.getByRole('button', { name: /api/i });
    if (await apiTab.isVisible()) {
      await apiTab.click();
      await page.screenshot({ path: `${SCREENSHOT_DIR}/11b-settings-api-keys.png`, fullPage: true });
    }
  });
});
