import { Page, expect } from '@playwright/test'

/** Navigate to a pipeline page and wait for the canvas to be ready */
export async function goToCanvas(page: Page, type: 'ml' | 'llm' = 'ml') {
  await page.goto(`/pipeline/${type}`)
  await expect(page.locator('.react-flow')).toBeVisible()
}

/** Load the first built-in sample pipeline via the Samples page */
export async function loadSamplePipeline(page: Page, type: 'ml' | 'llm' = 'ml') {
  await page.goto('/samples')
  if (type === 'llm') {
    await page.getByRole('button', { name: /LLM Pipelines/i }).click()
  }
  await page.getByRole('button', { name: /Open in Canvas/i }).first().click()
  // Wait for canvas + nodes
  await expect(page.locator('.react-flow')).toBeVisible()
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 8000 })
}

/** Drag the first palette item matching labelPattern onto the center of the canvas */
export async function dropNodeByLabel(
  page: Page,
  labelPattern: string | RegExp,
  offsetX = 0,
  offsetY = 0
) {
  const paletteItem = page
    .locator('[data-testid="node-palette"] [draggable="true"]')
    .filter({ hasText: labelPattern })
    .first()
  await expect(paletteItem).toBeVisible()

  const canvas = page.locator('.react-flow__pane')
  const cb = await canvas.boundingBox()
  if (!cb) throw new Error('Canvas not found')

  const src = await paletteItem.boundingBox()
  if (!src) throw new Error('Palette item not found')

  const targetX = cb.x + cb.width / 2 + offsetX
  const targetY = cb.y + cb.height / 2 + offsetY

  await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetX, targetY, { steps: 10 })
  await page.mouse.up()

  // Wait for the node to become visible
  await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 5000 })
}

/** Drop two different nodes and return their locators */
export async function dropTwoNodes(page: Page) {
  const canvas = page.locator('.react-flow__pane')
  const cb = await canvas.boundingBox()
  if (!cb) throw new Error('Canvas not found')

  // Drop first node (offset left)
  const items = page.locator('[data-testid="node-palette"] [draggable="true"]')
  const item1 = items.nth(0)
  const item2 = items.nth(1)

  for (const [item, tx, ty] of [
    [item1, cb.x + cb.width * 0.3, cb.y + cb.height / 2],
    [item2, cb.x + cb.width * 0.7, cb.y + cb.height / 2],
  ] as const) {
    const src = await (item as typeof item1).boundingBox()
    if (!src) continue
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2)
    await page.mouse.down()
    await page.mouse.move(tx, ty, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(300)
  }

  await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 5000 })
}

/** Get count of visible RF nodes */
export async function getNodeCount(page: Page): Promise<number> {
  return page.locator('.react-flow__node').count()
}
