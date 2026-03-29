import { test, expect } from '@playwright/test'
import { goToCanvas, loadSamplePipeline, dropNodeByLabel } from './helpers'

test.describe('Node Inspector', () => {
  test.beforeEach(async ({ page }) => {
    await goToCanvas(page, 'ml')
  })

  test('shows placeholder when no node is selected', async ({ page }) => {
    await expect(
      page.locator('[data-testid="node-inspector"]').getByText(/select a node/i)
    ).toBeVisible()
  })

  test('inspector has correct width', async ({ page }) => {
    const inspector = page.locator('[data-testid="node-inspector"]')
    const box = await inspector.boundingBox()
    expect(box!.width).toBeGreaterThan(200)
    expect(box!.width).toBeLessThan(400)
  })

  test('clicking a node shows its definition in the inspector', async ({ page }) => {
    await dropNodeByLabel(page, /csv/i)
    await page.locator('.react-flow__node').first().click()
    const inspector = page.locator('[data-testid="node-inspector"]')
    await expect(inspector.getByText(/csv/i).first()).toBeVisible({ timeout: 3000 })
  })

  test('inspector shows node label and id', async ({ page }) => {
    await loadSamplePipeline(page)
    await page.locator('.react-flow__node').first().click()
    const inspector = page.locator('[data-testid="node-inspector"]')
    // Should show a label (not empty)
    await expect(inspector.locator('p').first()).not.toBeEmpty()
  })

  test('inspector shows ML badge for ML nodes', async ({ page }) => {
    await loadSamplePipeline(page)
    await page.locator('.react-flow__node').first().click()
    await expect(
      page.locator('[data-testid="node-inspector"]').getByText('ML')
    ).toBeVisible({ timeout: 3000 })
  })

  test('inspector shows config form fields', async ({ page }) => {
    await loadSamplePipeline(page)
    await page.locator('.react-flow__node').first().click()
    const inspector = page.locator('[data-testid="node-inspector"]')
    // Should have at least one input/select/textarea
    const formFields = inspector.locator('input, select, textarea')
    const count = await formFields.count()
    expect(count).toBeGreaterThan(0)
  })

  test('inspector shows Inputs section with port types', async ({ page }) => {
    await loadSamplePipeline(page)
    // Click a node that has inputs (not the first node)
    await page.locator('.react-flow__node').nth(1).click()
    const inspector = page.locator('[data-testid="node-inspector"]')
    await expect(inspector.getByText('Inputs')).toBeVisible({ timeout: 3000 })
  })

  test('inspector shows Outputs section', async ({ page }) => {
    await loadSamplePipeline(page)
    await page.locator('.react-flow__node').first().click()
    const inspector = page.locator('[data-testid="node-inspector"]')
    await expect(inspector.getByText('Outputs')).toBeVisible({ timeout: 3000 })
  })

  test('inspector shows pip packages', async ({ page }) => {
    await loadSamplePipeline(page)
    await page.locator('.react-flow__node').first().click()
    const inspector = page.locator('[data-testid="node-inspector"]')
    await expect(inspector.getByText(/Pip Packages/i)).toBeVisible({ timeout: 3000 })
  })

  test('config field changes are reflected in the form', async ({ page }) => {
    await loadSamplePipeline(page)
    await page.locator('.react-flow__node').first().click()
    const inspector = page.locator('[data-testid="node-inspector"]')
    const textInput = inspector.locator('input[type="text"]').first()
    if (await textInput.isVisible()) {
      await textInput.fill('test_value_123')
      await expect(textInput).toHaveValue('test_value_123')
    }
  })

  test('clicking pane resets inspector to placeholder', async ({ page }) => {
    await loadSamplePipeline(page)
    await page.locator('.react-flow__node').first().click()
    await expect(page.locator('[data-testid="node-inspector"]').getByText(/select a node/i)).not.toBeVisible()
    // Click empty canvas area
    const pane = page.locator('.react-flow__pane')
    const pb = await pane.boundingBox()
    if (pb) await page.mouse.click(pb.x + 10, pb.y + 10)
    await expect(
      page.locator('[data-testid="node-inspector"]').getByText(/select a node/i)
    ).toBeVisible({ timeout: 3000 })
  })

  test('select different nodes shows different configs', async ({ page }) => {
    await loadSamplePipeline(page)
    const nodes = page.locator('.react-flow__node')
    await nodes.nth(0).click()
    const text0 = await page.locator('[data-testid="node-inspector"]').textContent()
    await nodes.nth(2).click()
    const text2 = await page.locator('[data-testid="node-inspector"]').textContent()
    // Different nodes should show different content
    expect(text0).not.toBe(text2)
  })
})
