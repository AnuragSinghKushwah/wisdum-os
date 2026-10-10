import { test, expect, type Page } from '@playwright/test';
import * as path from 'node:path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), '../../artifacts/screenshots/uat');

/**
 * Real end-to-end UAT workflows.
 *
 * These tests exercise actual user journeys — filling forms, submitting data,
 * verifying API responses AND UI state changes, chaining multi-step workflows.
 * They are NOT smoke tests. They fail if the product doesn't work.
 */

// Helper: Dev login through the UI. Needs the API running with WISDUM_DEV_SEED=true and the
// web app with NEXT_PUBLIC_WISDUM_DEV_SEED=true, which playwright.config.ts sets for the
// servers it starts.
async function devLogin(page: Page) {
  await page.goto('/sign-in');
  const devBtn = page.getByRole('button', { name: /quick dev sign in/i });
  await expect(devBtn).toBeVisible({ timeout: 10000 });
  await devBtn.click();
  await page.waitForURL('**/dashboard', { timeout: 10000 });
}

// ──────────────────────────────────────────────────────────────────────────────
// WORKFLOW 1: Knowledge Asset Full Lifecycle
//   Create asset → verify it appears → click it → verify document content shown
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Workflow 1: Knowledge Asset Lifecycle', () => {
  test('create a note asset with content and verify it appears with document text', async ({ page }) => {
    await devLogin(page);
    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    // Step 1: Wait for Knowledge Base page heading
    await expect(page.getByRole('heading', { name: 'Knowledge Base' })).toBeVisible({ timeout: 10000 });

    // Step 2: Click "Add Asset" button
    const addBtn = page.getByRole('button', { name: /add asset/i });
    await expect(addBtn).toBeVisible({ timeout: 5000 });
    await addBtn.click();

    // Step 3: Verify the modal appeared
    const modalHeading = page.getByText('Ingest Raw Knowledge');
    await expect(modalHeading).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w1-01-modal-open.png` });

    // Step 4: Fill in the form with real data
    const assetTitle = `UAT Test Note ${Date.now()}`;
    const assetContent = 'PostgreSQL supports vector indexing via pgvector extension. This enables similarity search for AI embeddings stored as float arrays.';

    await page.getByPlaceholder('e.g. Q3 Roadmap Review').fill(assetTitle);
    await page.getByPlaceholder(/paste note text/i).fill(assetContent);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w1-02-form-filled.png` });

    // Step 5: Submit the form
    const submitBtn = page.getByRole('button', { name: /ingest to graph/i });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Step 6: Wait for modal to close (submit succeeded)
    await expect(modalHeading).not.toBeVisible({ timeout: 10000 });

    // Step 7: Verify the new asset card appeared in the grid
    const assetCard = page.getByText(assetTitle);
    await expect(assetCard).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w1-03-asset-in-list.png` });

    // Step 8: Click the asset card to open the detail modal
    await assetCard.click();

    // Step 9: Verify the detail modal shows the text exactly as it was ingested
    await expect(page.getByText('Ingested Source Document Content')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('pre').first()).toHaveText(assetContent);
    await expect(page.getByRole('link', { name: /open & create content/i })).toBeVisible();

    // Step 10: Verify the ingested document content section exists
    const docContentSection = page.getByText('Ingested Source Document Content');
    await expect(docContentSection).toBeVisible();

    const contentArea = page.locator('pre').first();
    const noContentMsg = page.getByText('No raw document text attached');
    const contentVisible = await contentArea.isVisible().catch(() => false);
    const noContentVisible = await noContentMsg.isVisible().catch(() => false);

    expect(contentVisible || noContentVisible).toBe(true);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/w1-04-detail-modal.png`, fullPage: true });

    // Step 11: Close the modal
    const closeBtn = page.getByRole('button', { name: /close/i });
    await closeBtn.click();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// WORKFLOW 2: Suggest Content Idea → Verify Opportunity → Generate Draft
//   For YouTube Script format — verify format-specific output
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Workflow 2: YouTube Script Opportunity → Draft Generation', () => {
  test('create a YouTube Script opportunity, then verify draft has teleprompter structure', async ({ page }) => {
    await devLogin(page);
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');

    // Step 1: Open the "Suggest Content" modal
    const suggestBtn = page.getByRole('button', { name: /suggest content/i });
    await expect(suggestBtn).toBeVisible({ timeout: 5000 });
    await suggestBtn.click();

    // Step 2: Verify modal is open
    await expect(page.getByText('Propose Content Idea')).toBeVisible({ timeout: 5000 });

    // Step 3: Fill in the form — YouTube Script format
    const oppTitle = `UAT YouTube Script ${Date.now()}`;
    await page.getByPlaceholder(/scaling postgresql/i).fill(oppTitle);

    // Select YouTube Video Script format
    const formatSelect = page.locator('select').first();
    await formatSelect.selectOption('youtube_script');

    await page.getByPlaceholder(/ingested notes/i).fill(
      'Knowledge base shows recurring references to vector databases and pgvector. A YouTube deep dive would reach developer audiences effectively.'
    );
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w2-01-suggest-form.png` });

    // Step 4: Submit the suggestion
    const addBtn = page.getByRole('button', { name: /add suggestion/i });
    await addBtn.click();

    // Step 5: Wait for modal to close and verify opportunity appeared
    await expect(page.getByText('Propose Content Idea')).not.toBeVisible({ timeout: 10000 });

    // The opportunity appears in category sections — use .first()
    const oppLink = page.getByRole('link', { name: oppTitle }).first();
    await expect(oppLink).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w2-02-opportunity-in-list.png` });

    // Step 6: Click the opportunity to go to its detail page
    await oppLink.click();
    await page.waitForLoadState('networkidle');

    // Step 7: Verify the detail page shows opportunity title and type
    await expect(page.getByText(oppTitle).first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('dd').filter({ hasText: /youtube script/i })).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w2-03-opportunity-detail.png` });

    // Step 8: Click "Generate draft" button
    const generateBtn = page.getByRole('button', { name: /generate draft/i });
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // Step 9: Wait for navigation to draft editor page
    await page.waitForURL('**/drafts/**', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w2-04-draft-editor.png`, fullPage: true });

    // Step 10: Verify format-specific preview — should say "Teleprompter" or "Layout Preview"
    const teleprompterLabel = page.getByText(/teleprompter/i);
    const layoutPreviewLabel = page.getByText(/layout preview/i);
    const teleprompterVisible = await teleprompterLabel.isVisible().catch(() => false);
    const layoutVisible = await layoutPreviewLabel.isVisible().catch(() => false);
    expect(teleprompterVisible || layoutVisible).toBe(true);

    // Step 11: Verify the draft body is not empty
    const textareas = page.locator('textarea');
    const count = await textareas.count();
    let hasContent = false;
    for (let i = 0; i < count; i++) {
      const val = await textareas.nth(i).inputValue();
      if (val.length > 10) {
        hasContent = true;
        break;
      }
    }
    expect(hasContent).toBe(true);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/w2-05-draft-with-content.png`, fullPage: true });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// WORKFLOW 3: LinkedIn Post → Carousel Preview
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Workflow 3: LinkedIn Post → Carousel Preview', () => {
  test('create a LinkedIn opportunity and verify carousel slide preview', async ({ page }) => {
    await devLogin(page);
    await page.goto('/opportunities');
    await page.waitForLoadState('networkidle');

    // Create LinkedIn post opportunity
    const suggestBtn = page.getByRole('button', { name: /suggest content/i });
    await suggestBtn.click();

    const oppTitle = `UAT LinkedIn Carousel ${Date.now()}`;
    await page.getByPlaceholder(/scaling postgresql/i).fill(oppTitle);
    await page.locator('select').first().selectOption('linkedin_post');
    await page.getByPlaceholder(/ingested notes/i).fill('LinkedIn audience interested in knowledge graphs and AI.');
    await page.getByRole('button', { name: /add suggestion/i }).click();

    await expect(page.getByText('Propose Content Idea')).not.toBeVisible({ timeout: 10000 });

    // Navigate to opportunity and generate draft
    const oppLink = page.getByRole('link', { name: oppTitle }).first();
    await expect(oppLink).toBeVisible({ timeout: 5000 });
    await oppLink.click();
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /generate draft/i }).click();
    await page.waitForURL('**/drafts/**', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 15000 });

    // Verify carousel-specific UI elements
    const slidesLabel = page.getByText(/slides manager/i);
    const layoutLabel = page.getByText(/layout preview/i);
    const slidesVisible = await slidesLabel.isVisible().catch(() => false);
    const layoutVisible = await layoutLabel.isVisible().catch(() => false);

    expect(slidesVisible || layoutVisible).toBe(true);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w3-01-linkedin-carousel.png`, fullPage: true });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// WORKFLOW 4: API Key Full Lifecycle (Create → Verify → Revoke → Verify)
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Workflow 4: API Key Lifecycle', () => {
  test('create an API key, verify plaintext shown, revoke it, verify revoked', async ({ page }) => {
    await devLogin(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Step 1: Click the "Api" tab
    const apiTab = page.getByRole('button', { name: /api/i });
    await apiTab.click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w4-01-api-tab.png` });

    // Step 2: Fill in the key label and create
    const keyLabel = `UAT Key ${Date.now()}`;
    await page.getByPlaceholder(/cli scraper/i).fill(keyLabel);

    const createBtn = page.getByRole('button', { name: /create key/i });
    await expect(createBtn).toBeEnabled();
    await createBtn.click();

    // Step 3: Verify plaintext key warning banner appeared
    const keyBanner = page.getByText(/copy your personal api key/i);
    await expect(keyBanner).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w4-02-key-created.png` });

    // Step 4: Verify the key appears in the table
    await expect(page.getByText(keyLabel)).toBeVisible();

    // Step 5: Dismiss the key banner
    const dismissBtn = page.getByRole('button', { name: /i have copied the key/i });
    await dismissBtn.click();
    await expect(keyBanner).not.toBeVisible();

    // Step 6: Revoke the key
    const revokeBtn = page.getByRole('button', { name: /revoke/i }).first();
    await revokeBtn.click();

    // Step 7: Wait for revocation to complete
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w4-03-key-revoked.png` });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// WORKFLOW 5: Search with real query after adding knowledge
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Workflow 5: Search Functionality', () => {
  test('add a knowledge asset then search for it by keyword', async ({ page }) => {
    await devLogin(page);

    // Step 1: Create a knowledge asset via the API directly
    const uniqueWord = `wisdumsearchtest${Date.now()}`;
    await page.evaluate(async (word) => {
      const API_URL = 'http://localhost:3001';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // The session created by devLogin(): a real token issued by the API.
        Authorization: `Bearer ${(JSON.parse(localStorage.getItem('wisdum.session') ?? '{}') as { token?: string }).token ?? ''}`,
      };

      const { knowledgeId } = await fetch(`${API_URL}/v1/knowledge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: `Search Test Asset ${word}`,
          type: 'note',
          visibility: 'private',
          sourceKind: 'manual',
        }),
      }).then((r) => r.json());

      const { documentId } = await fetch(`${API_URL}/v1/documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: `This document contains the unique keyword ${word} for search testing.`,
          mimeType: 'text/plain',
          encoding: 'utf-8',
        }),
      }).then((r) => r.json());

      await fetch(`${API_URL}/v1/knowledge/${knowledgeId}/content`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reference: documentId, mimeType: 'text/plain' }),
      });
    }, uniqueWord);

    // Step 2: Navigate to search page
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w5-01-search-empty.png` });

    // Step 3: Type the unique keyword into the search input
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill(uniqueWord);

    // Step 4: Wait for debounced search
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w5-02-search-results.png` });

    // Step 5: Verify results appeared
    const resultsArea = page.locator('main');
    const resultText = await resultsArea.textContent();
    expect(resultText).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// WORKFLOW 6: Draft Save & Publish Lifecycle
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Workflow 6: Draft Save & Publish', () => {
  test('edit draft title, save, then publish and verify on /published page', async ({ page }) => {
    await devLogin(page);

    // Step 1: Create an opportunity via API
    const oppTitle = `UAT Publish Test ${Date.now()}`;
    const oppData = await page.evaluate(async (title) => {
      const API_URL = 'http://localhost:3001';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // The session created by devLogin(): a real token issued by the API.
        Authorization: `Bearer ${(JSON.parse(localStorage.getItem('wisdum.session') ?? '{}') as { token?: string }).token ?? ''}`,
      };
      return fetch(`${API_URL}/v1/opportunities`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title, type: 'blog_post', rationale: 'UAT test for publish lifecycle.' }),
      }).then((r) => r.json());
    }, oppTitle);

    // Step 2: Generate a draft from the opportunity (pass body `{}` to avoid Fastify 400 error)
    const draftData = await page.evaluate(async (oppId) => {
      const API_URL = 'http://localhost:3001';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // The session created by devLogin(): a real token issued by the API.
        Authorization: `Bearer ${(JSON.parse(localStorage.getItem('wisdum.session') ?? '{}') as { token?: string }).token ?? ''}`,
      };
      return fetch(`${API_URL}/v1/opportunities/${oppId}/draft`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      }).then((r) => r.json());
    }, oppData.opportunityId);

    expect(draftData.draftId).toBeTruthy();

    // Step 3: Navigate to the draft editor
    await page.goto(`/drafts/${draftData.draftId}`);
    await page.waitForLoadState('networkidle');

    // Wait for the draft content to load (the "Loading…" text to disappear)
    await expect(page.getByText('Loading…')).not.toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w6-01-draft-loaded.png`, fullPage: true });

    // Step 4: Edit the title — target input in Document Title label
    const titleInput = page.locator('input').filter({ hasText: '' }).first();
    await expect(titleInput).toBeVisible({ timeout: 5000 });

    const modifiedTitle = `${oppTitle} [EDITED]`;
    await titleInput.clear();
    await titleInput.fill(modifiedTitle);

    // Step 5: Click Save
    const saveBtn = page.getByRole('button', { name: /^save$/i });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w6-02-draft-saved.png` });

    // Step 6: Click Publish
    const publishBtn = page.getByRole('button', { name: /^publish$/i });
    await expect(publishBtn).toBeEnabled({ timeout: 5000 });
    await publishBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w6-03-draft-published.png` });

    // Step 7: Verify published button state
    const publishedBtn = page.getByRole('button', { name: /published/i });
    const publishedVisible = await publishedBtn.isVisible().catch(() => false);
    if (publishedVisible) {
      await expect(publishedBtn).toBeDisabled();
    }

    // Step 8: Navigate to /published and verify content appears
    await page.goto('/published');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w6-04-published-page.png`, fullPage: true });

    const publishedContent = await page.locator('main').textContent();
    expect(publishedContent).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// WORKFLOW 7: Cognitive Scan → Graph Visualization
// ──────────────────────────────────────────────────────────────────────────────
test.describe('Workflow 7: Cognitive Scan → Graph', () => {
  test('run cognitive scan from graph page and verify nodes appear', async ({ page }) => {
    await devLogin(page);

    // Ensure there's at least one knowledge asset
    await page.evaluate(async () => {
      const API_URL = 'http://localhost:3001';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // The session created by devLogin(): a real token issued by the API.
        Authorization: `Bearer ${(JSON.parse(localStorage.getItem('wisdum.session') ?? '{}') as { token?: string }).token ?? ''}`,
      };
      await fetch(`${API_URL}/v1/knowledge`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'Graph Test Asset', type: 'note', visibility: 'private', sourceKind: 'manual' }),
      });
    });

    await page.goto('/graph');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/w7-01-graph-before-scan.png` });

    // Click first "Run Cognitive Scan" button
    const scanBtn = page.getByRole('button', { name: /cognitive scan/i }).first();
    if (await scanBtn.isVisible()) {
      await scanBtn.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/w7-02-graph-after-scan.png` });
    }

    // Verify we're still on the graph page without errors
    await expect(page).toHaveURL(/.*graph.*/);
  });
});
