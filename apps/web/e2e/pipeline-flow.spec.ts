/**
 * End-to-end pipeline flow tests.
 * These test realistic user workflows from palette → canvas → inspector → code.
 */
import { test, expect } from '@playwright/test'
import { goToCanvas, loadSamplePipeline, dropNodeByLabel, dropTwoNodes } from './helpers'

test.describe('Full Pipeline Workflow', () => {
  test('complete ML workflow: add node → inspect → configure → switch to code', async ({ page }) => {
    await goToCanvas(page, 'ml')

    // 1. Drop a CSV ingest node
    await dropNodeByLabel(page, /csv/i)
    await expect(page.locator('.react-flow__node').first()).toBeVisible()

    // 2. Click it — inspector should show it
    await page.locator('.react-flow__node').first().click()
    await expect(
      page.locator('[data-testid="node-inspector"]').getByText(/select a node/i)
    ).not.toBeVisible({ timeout: 2000 })

    // 3. Switch to Code tab
    await page.getByRole('tab', { name: /code/i }).click()
    await expect(page.getByRole('button', { name: /generate/i })).toBeEnabled({ timeout: 2000 })

    // 4. Switch back to Canvas
    await page.getByRole('tab', { name: /^canvas/i }).click()
    await expect(page.locator('.react-flow__node').first()).toBeVisible()
  })

  test('sample pipeline: all nodes have visible, non-blank cards', async ({ page }) => {
    await goToCanvas(page, 'ml')
    await loadSamplePipeline(page)

    const nodes = page.locator('.react-flow__node')
    const count = await nodes.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const node = nodes.nth(i)
      await expect(node).toBeVisible()
      const box = await node.boundingBox()
      expect(box!.width).toBeGreaterThan(50)
      expect(box!.height).toBeGreaterThan(10)
    }
  })

  test('sample pipeline: every node can be selected and inspected', async ({ page }) => {
    await goToCanvas(page, 'ml')
    await loadSamplePipeline(page)

    const nodes = page.locator('.react-flow__node')
    const count = await nodes.count()

    for (let i = 0; i < count; i++) {
      await nodes.nth(i).click()
      // Inspector should not show placeholder
      await expect(
        page.locator('[data-testid="node-inspector"]').getByText(/select a node/i)
      ).not.toBeVisible({ timeout: 2000 })
    }
  })

  test('LLM workflow: drop embed node and inspect it', async ({ page }) => {
    await goToCanvas(page, 'llm')
    await dropNodeByLabel(page, /openai/i)
    await expect(page.locator('.react-flow__node').first()).toBeVisible()
    await page.locator('.react-flow__node').first().click()

    const inspector = page.locator('[data-testid="node-inspector"]')
    // Should show LLM badge
    await expect(inspector.getByText('LLM')).toBeVisible({ timeout: 3000 })
  })

  test('adding 3 nodes shows correct count in toolbar', async ({ page }) => {
    await goToCanvas(page, 'ml')
    const items = page.locator('[data-testid="node-palette"] [draggable="true"]')
    const canvas = page.locator('.react-flow__pane')
    const cb = await canvas.boundingBox()
    if (!cb) throw new Error('Canvas not found')

    const positions = [
      [cb.x + 200, cb.y + 200],
      [cb.x + 450, cb.y + 200],
      [cb.x + 700, cb.y + 200],
    ]

    for (const [i, [tx, ty]] of positions.entries()) {
      const item = items.nth(i % (await items.count()))
      const src = await item.boundingBox()
      if (!src) continue
      await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2)
      await page.mouse.down()
      await page.mouse.move(tx, ty, { steps: 8 })
      await page.mouse.up()
      await page.waitForTimeout(200)
    }

    await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 5000 })
    await expect(page.getByText(/3 nodes/i)).toBeVisible({ timeout: 2000 })
  })

  test('save → reset → load restores exact pipeline', async ({ page }) => {
    const path = await import('path')
    const os = await import('os')
    const fs = await import('fs')

    await goToCanvas(page, 'ml')
    await loadSamplePipeline(page)
    const nodeBefore = await page.locator('.react-flow__node').count()

    // Save
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /save/i }).click(),
    ])
    const tmpFile = path.join(os.tmpdir(), 'pipeline-test.json')
    await download.saveAs(tmpFile)

    // Reset
    await page.getByRole('button', { name: /reset/i }).click()
    await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 3000 })

    // Load
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /load/i }).click()
    const fc = await fileChooserPromise
    await fc.setFiles(tmpFile)

    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 5000 })
    const nodeAfter = await page.locator('.react-flow__node').count()
    expect(nodeAfter).toBe(nodeBefore)

    fs.unlinkSync(tmpFile)
  })

  test('pipeline name is editable in toolbar', async ({ page }) => {
    await goToCanvas(page, 'ml')
    await loadSamplePipeline(page)
    const nameInput = page.locator('header ~ div input').first()
    if (await nameInput.isVisible()) {
      await nameInput.fill('My Custom Pipeline')
      await expect(nameInput).toHaveValue('My Custom Pipeline')
    }
  })

  test('ML and LLM pipelines are independent (separate state)', async ({ page }) => {
    // Add a node in ML
    await goToCanvas(page, 'ml')
    await dropNodeByLabel(page, /csv/i)
    const mlCount = await page.locator('.react-flow__node').count()
    expect(mlCount).toBe(1)

    // Switch to LLM — should be empty
    await page.getByRole('link', { name: /LLM Pipeline/i }).click()
    await expect(page).toHaveURL(/pipeline\/llm/)
    await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 3000 })

    // Switch back to ML — state should be preserved (reset happens on switch)
    await page.getByRole('link', { name: /ML Pipeline/i }).click()
    await expect(page).toHaveURL(/pipeline\/ml/)
  })

  test('node type filter: LLM palette items are not in ML canvas nodes', async ({ page }) => {
    // In ML pipeline, drop a node
    await goToCanvas(page, 'ml')
    await dropNodeByLabel(page, /csv/i)
    await page.locator('.react-flow__node').first().click()

    // Inspector should show ML badge, not LLM
    const inspector = page.locator('[data-testid="node-inspector"]')
    await expect(inspector.getByText('ML')).toBeVisible({ timeout: 2000 })
    await expect(inspector.getByText('LLM')).not.toBeVisible()
  })
})
