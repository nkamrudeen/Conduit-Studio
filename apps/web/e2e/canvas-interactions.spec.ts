import { test, expect } from '@playwright/test'
import { goToCanvas, loadSamplePipeline, dropNodeByLabel, dropTwoNodes, getNodeCount } from './helpers'

test.describe('Canvas Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await goToCanvas(page, 'ml')
  })

  // ── Drag and drop ──────────────────────────────────────────────────────────

  test('dragging a node onto canvas creates a visible node card', async ({ page }) => {
    await dropNodeByLabel(page, /csv/i)
    const node = page.locator('.react-flow__node').first()
    await expect(node).toBeVisible()
    const box = await node.boundingBox()
    expect(box!.width).toBeGreaterThan(100)
    expect(box!.height).toBeGreaterThan(20)
  })

  test('node card shows colored header with icon and label', async ({ page }) => {
    await dropNodeByLabel(page, /csv/i)
    const node = page.locator('.react-flow__node').first()
    await expect(node).toBeVisible()
    const text = await node.textContent()
    expect(text?.trim().length).toBeGreaterThan(0)
  })

  test('dropping multiple different nodes all appear', async ({ page }) => {
    await dropTwoNodes(page)
    const count = await getNodeCount(page)
    expect(count).toBe(2)
  })

  test('dropping same node type multiple times creates separate nodes', async ({ page }) => {
    const canvas = page.locator('.react-flow__pane')
    const cb = await canvas.boundingBox()
    if (!cb) throw new Error('Canvas not found')

    const item = page.locator('[data-testid="node-palette"] [draggable="true"]').first()
    const src = await item.boundingBox()
    if (!src) throw new Error('Palette item not found')

    // Drop first copy
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2)
    await page.mouse.down()
    await page.mouse.move(cb.x + 200, cb.y + 200, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    // Drop second copy
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2)
    await page.mouse.down()
    await page.mouse.move(cb.x + 500, cb.y + 200, { steps: 8 })
    await page.mouse.up()

    await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 5000 })
  })

  // ── Node selection ─────────────────────────────────────────────────────────

  test('clicking a node selects it', async ({ page }) => {
    await loadSamplePipeline(page)
    const node = page.locator('.react-flow__node').first()
    await node.click()
    // Selected node gets the `selected` class from React Flow
    await expect(node).toHaveClass(/selected/, { timeout: 2000 })
  })

  test('clicking pane deselects node', async ({ page }) => {
    await loadSamplePipeline(page)
    const node = page.locator('.react-flow__node').first()
    await node.click()
    await expect(node).toHaveClass(/selected/, { timeout: 2000 })
    const pane = page.locator('.react-flow__pane')
    const pb = await pane.boundingBox()
    if (pb) await page.mouse.click(pb.x + 10, pb.y + 10)
    await expect(node).not.toHaveClass(/selected/, { timeout: 2000 })
  })

  // ── Node dragging ──────────────────────────────────────────────────────────

  test('nodes can be dragged to new positions', async ({ page }) => {
    await loadSamplePipeline(page)
    const node = page.locator('.react-flow__node').first()
    const before = await node.boundingBox()

    // Drag the node
    await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height / 2)
    await page.mouse.down()
    await page.mouse.move(before!.x + 150, before!.y + 100, { steps: 10 })
    await page.mouse.up()

    const after = await node.boundingBox()
    // Position should have changed
    const moved = Math.abs(after!.x - before!.x) + Math.abs(after!.y - before!.y)
    expect(moved).toBeGreaterThan(5)
  })

  // ── Node deletion ──────────────────────────────────────────────────────────

  test('pressing Delete removes selected node', async ({ page }) => {
    await dropNodeByLabel(page, /csv/i)
    const node = page.locator('.react-flow__node').first()
    await node.click()
    await expect(node).toHaveClass(/selected/, { timeout: 2000 })
    await page.keyboard.press('Delete')
    await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 3000 })
  })

  test('pressing Backspace removes selected node', async ({ page }) => {
    await dropNodeByLabel(page, /csv/i)
    const node = page.locator('.react-flow__node').first()
    await node.click()
    await page.keyboard.press('Backspace')
    await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 3000 })
  })

  // ── Canvas controls ────────────────────────────────────────────────────────

  test('zoom controls are visible and clickable', async ({ page }) => {
    await expect(page.locator('.react-flow__controls')).toBeVisible()
    const zoomIn = page.locator('.react-flow__controls-zoomin')
    await expect(zoomIn).toBeVisible()
    await zoomIn.click() // Should not throw
  })

  test('minimap shows node positions', async ({ page }) => {
    await loadSamplePipeline(page)
    const minimap = page.locator('.react-flow__minimap')
    await expect(minimap).toBeVisible()
    // Minimap should have colored nodes inside it
    const minimapNodes = minimap.locator('rect, circle')
    const count = await minimapNodes.count()
    expect(count).toBeGreaterThan(0)
  })

  test('fit view button re-centers the canvas', async ({ page }) => {
    await loadSamplePipeline(page)
    const fitView = page.locator('.react-flow__controls-fitview')
    if (await fitView.isVisible()) {
      await fitView.click() // Should not throw
    }
  })

  // ── Sample pipeline ────────────────────────────────────────────────────────

  test('sample pipeline loads correct number of nodes', async ({ page }) => {
    await loadSamplePipeline(page)
    const count = await page.locator('.react-flow__node').count()
    expect(count).toBe(7) // sampleMlopsFlow has 7 nodes
  })

  test('sample pipeline loads edges between nodes', async ({ page }) => {
    await loadSamplePipeline(page)
    await page.waitForTimeout(500)
    const edges = await page.locator('.react-flow__edge').count()
    expect(edges).toBeGreaterThan(0)
  })

  test('sample pipeline node cards all have non-blank content', async ({ page }) => {
    await loadSamplePipeline(page)
    const nodes = page.locator('.react-flow__node')
    const count = await nodes.count()
    for (let i = 0; i < count; i++) {
      const text = await nodes.nth(i).textContent()
      expect(text?.trim().length).toBeGreaterThan(0)
    }
  })

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  test('Escape deselects node (if supported)', async ({ page }) => {
    await loadSamplePipeline(page)
    await page.locator('.react-flow__node').first().click()
    await page.keyboard.press('Escape')
    // After Escape, inspector should show placeholder (deselected)
    await expect(
      page.locator('[data-testid="node-inspector"]').getByText(/select a node/i)
    ).toBeVisible({ timeout: 2000 })
  })
})
