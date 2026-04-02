/**
 * Demo recording script for ConduitCraft AI
 *
 * Uses playwright.record.config.ts (video: 'on', headless: false).
 * Video files are written to apps/web/test-results/<test-name>/video.webm
 *
 * Usage (requires the app to be running on http://localhost:3000):
 *   cd apps/web
 *   pnpm record-demo
 *
 * Then convert to gif/mp4:
 *   ffmpeg -i "test-results/<dir>/video.webm" \
 *     -vf "fps=12,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
 *     -loop 0 ../../docs/demo.gif
 *
 *   ffmpeg -i "test-results/<dir>/video.webm" \
 *     -c:v libx264 -pix_fmt yuv420p ../../docs/demo.mp4
 */

import { test } from '@playwright/test'

test('ConduitCraft AI — demo walkthrough', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  // ------------------------------------------------------------------ 1. Samples page — browse ML samples
  await page.goto('/samples')
  await page.getByText('Sample Pipelines').waitFor({ state: 'visible' })
  await page.waitForTimeout(1200)

  // ------------------------------------------------------------------ 2. Open first ML sample
  await page.getByRole('button', { name: /Open in Canvas/i }).first().click()
  await page.locator('.react-flow').waitFor({ state: 'visible' })
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 8000 })
  await page.waitForTimeout(1000)

  // ------------------------------------------------------------------ 3. Inspect nodes
  const nodeCount = await page.locator('.react-flow__node').count()
  for (let i = 0; i < Math.min(nodeCount, 4); i++) {
    await page.locator('.react-flow__node').nth(i).click()
    await page.waitForTimeout(700)
  }
  // Deselect
  const pane = page.locator('.react-flow__pane')
  const pb = await pane.boundingBox()
  if (pb) await page.mouse.click(pb.x + 30, pb.y + 30)
  await page.waitForTimeout(600)

  // ------------------------------------------------------------------ 4. Code generation panel
  await page.getByRole('tab', { name: /code/i }).click()
  await page.waitForTimeout(800)

  for (const label of ['Python Script', 'Notebook', 'Kubeflow DSL', 'Dockerfile']) {
    await page.getByRole('tab', { name: new RegExp(label, 'i') }).click()
    await page.waitForTimeout(500)
  }

  // Try generating (backend may not be running — that's OK)
  await page.getByRole('tab', { name: /python script/i }).click()
  const genBtn = page.getByRole('button', { name: /generate/i })
  if (await genBtn.isEnabled()) {
    await genBtn.click()
    await page.waitForTimeout(2000)
  }

  // Back to canvas
  await page.getByRole('tab', { name: /^canvas/i }).click()
  await page.waitForTimeout(600)

  // ------------------------------------------------------------------ 5. Integrations panel
  await page.locator('button[title="Integrations"]').click()
  await page.getByRole('heading', { name: 'Integrations', exact: true }).waitFor({ state: 'visible', timeout: 3000 })
  await page.waitForTimeout(1200)
  await page.locator('p.text-xs.font-semibold', { hasText: 'AWS S3' }).scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  await page.locator('button[title="Integrations"]').click()
  await page.waitForTimeout(500)

  // ------------------------------------------------------------------ 6. Project Files panel
  await page.locator('button[title="Project Files"]').click()
  await page.waitForTimeout(1200)
  await page.locator('button[title="Project Files"]').click()
  await page.waitForTimeout(500)

  // ------------------------------------------------------------------ 7. Samples page — LLM tab
  await page.goto('/samples')
  await page.getByText('Sample Pipelines').waitFor({ state: 'visible' })
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: /LLM Pipelines/i }).click()
  await page.waitForTimeout(600)

  // ------------------------------------------------------------------ 8. Open first LLM sample
  await page.getByRole('button', { name: /Open in Canvas/i }).first().click()
  await page.locator('.react-flow').waitFor({ state: 'visible' })
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 8000 })
  await page.waitForTimeout(1000)

  // Inspect a couple of LLM nodes
  const llmCount = await page.locator('.react-flow__node').count()
  for (let i = 0; i < Math.min(llmCount, 3); i++) {
    await page.locator('.react-flow__node').nth(i).click()
    await page.waitForTimeout(700)
  }

  await page.waitForTimeout(800)
})
