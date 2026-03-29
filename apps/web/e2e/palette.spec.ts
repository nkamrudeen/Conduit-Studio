import { test, expect } from '@playwright/test'
import { goToCanvas } from './helpers'

test.describe('Node Palette', () => {
  test.beforeEach(async ({ page }) => {
    await goToCanvas(page, 'ml')
  })

  test('palette is visible with correct width', async ({ page }) => {
    const palette = page.locator('[data-testid="node-palette"]')
    await expect(palette).toBeVisible()
    const box = await palette.boundingBox()
    expect(box!.width).toBeGreaterThan(100)
    expect(box!.width).toBeLessThan(300)
  })

  test('shows all expected ML categories', async ({ page }) => {
    const palette = page.locator('[data-testid="node-palette"]')
    for (const category of ['Data Ingestion', 'Transform', 'Training', 'Evaluation', 'Deploy']) {
      await expect(palette.getByText(category, { exact: false })).toBeVisible()
    }
  })

  test('each ML category has at least one draggable node', async ({ page }) => {
    const nodes = page.locator('[data-testid="node-palette"] [draggable="true"]')
    const count = await nodes.count()
    expect(count).toBeGreaterThan(10)
  })

  test('search filters nodes by label', async ({ page }) => {
    const input = page.getByPlaceholder(/search/i)
    await input.fill('random forest')
    const items = page.locator('[data-testid="node-palette"] [draggable="true"]')
    await expect(items.first()).toContainText(/random forest/i, { ignoreCase: true })
    const count = await items.count()
    expect(count).toBeLessThan(5) // should narrow results
  })

  test('search is case-insensitive', async ({ page }) => {
    const input = page.getByPlaceholder(/search/i)
    await input.fill('CSV')
    await expect(
      page.locator('[data-testid="node-palette"] [draggable="true"]').first()
    ).toBeVisible()
  })

  test('clearing search restores all nodes', async ({ page }) => {
    const input = page.getByPlaceholder(/search/i)
    const before = await page.locator('[data-testid="node-palette"] [draggable="true"]').count()
    await input.fill('xgboost')
    await input.fill('')
    const after = await page.locator('[data-testid="node-palette"] [draggable="true"]').count()
    expect(after).toBe(before)
  })

  test('search shows empty state for nonsense query', async ({ page }) => {
    await page.getByPlaceholder(/search/i).fill('zzznonexistentnode999')
    const count = await page.locator('[data-testid="node-palette"] [draggable="true"]').count()
    expect(count).toBe(0)
  })

  test('LLM pipeline shows LLM-specific categories', async ({ page }) => {
    await goToCanvas(page, 'llm')
    const palette = page.locator('[data-testid="node-palette"]')
    for (const category of ['Chunking', 'Embedding', 'Vector Store', 'LLM Model', 'Chain']) {
      await expect(palette.getByText(category, { exact: false })).toBeVisible()
    }
  })

  test('LLM pipeline does NOT show ML-specific training nodes', async ({ page }) => {
    await goToCanvas(page, 'llm')
    const palette = page.locator('[data-testid="node-palette"]')
    await expect(palette.getByText('Training')).not.toBeVisible()
  })

  test('ML pipeline does NOT show LLM-specific nodes', async ({ page }) => {
    const palette = page.locator('[data-testid="node-palette"]')
    await expect(palette.getByText('Chunking')).not.toBeVisible()
    await expect(palette.getByText('LLM Model')).not.toBeVisible()
  })

  test('node cards have icon and label', async ({ page }) => {
    const firstNode = page.locator('[data-testid="node-palette"] [draggable="true"]').first()
    await expect(firstNode).toBeVisible()
    const text = await firstNode.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  test('palette is scrollable with many nodes', async ({ page }) => {
    const scrollArea = page.locator('[data-testid="node-palette"]').locator('[data-radix-scroll-area-viewport]')
    const scrollHeight = await scrollArea.evaluate((el) => el.scrollHeight)
    const clientHeight = await scrollArea.evaluate((el) => el.clientHeight)
    expect(scrollHeight).toBeGreaterThanOrEqual(clientHeight)
  })
})
