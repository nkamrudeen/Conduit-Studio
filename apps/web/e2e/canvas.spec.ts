import { test, expect } from '@playwright/test'

test.describe('App shell', () => {
  test('loads and shows the IDE header', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('ConduitCraft AI')).toBeVisible()
    await expect(page.getByText('ML Pipeline')).toBeVisible()
    await expect(page.getByText('LLM Pipeline')).toBeVisible()
  })

  test('redirects / to /pipeline/ml', async ({ page }) => {
    await page.goto('/')
    // App should show ML pipeline layout
    await expect(page).toHaveURL(/pipeline\/ml/)
  })
})

test.describe('Node palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pipeline/ml')
    // Wait for palette to load
    await expect(page.locator('.react-flow')).toBeVisible()
  })

  test('shows node categories', async ({ page }) => {
    // At least one category heading should be visible
    const palette = page.locator('[data-testid="node-palette"]')
    await expect(palette).toBeVisible()
    // Check for known category labels
    await expect(palette.getByText(/ingest|transform|train/i).first()).toBeVisible()
  })

  test('search filters nodes', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('csv')
    await expect(page.getByText(/csv/i).first()).toBeVisible()
  })

  test('shows LLM nodes on LLM pipeline page', async ({ page }) => {
    await page.goto('/pipeline/llm')
    await expect(page.locator('[data-testid="node-palette"]')).toBeVisible()
    await expect(page.getByText(/embed|chunk|vector/i).first()).toBeVisible()
  })
})

test.describe('Canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pipeline/ml')
    await expect(page.locator('.react-flow')).toBeVisible()
  })

  test('renders React Flow canvas with background dots', async ({ page }) => {
    await expect(page.locator('.react-flow__background')).toBeVisible()
  })

  test('shows minimap and controls', async ({ page }) => {
    await expect(page.locator('.react-flow__minimap')).toBeVisible()
    await expect(page.locator('.react-flow__controls')).toBeVisible()
  })

  test('drag node from palette onto canvas renders a node card', async ({ page }) => {
    // Find first draggable node item in palette
    const paletteItem = page.locator('[draggable="true"]').first()
    await expect(paletteItem).toBeVisible()

    const canvas = page.locator('.react-flow__pane')
    const canvasBounds = await canvas.boundingBox()
    if (!canvasBounds) throw new Error('Canvas not found')

    // Get source bounds
    const srcBounds = await paletteItem.boundingBox()
    if (!srcBounds) throw new Error('Palette item not found')

    // Simulate drag-and-drop
    await page.mouse.move(srcBounds.x + srcBounds.width / 2, srcBounds.y + srcBounds.height / 2)
    await page.mouse.down()
    // Move to center of canvas in small steps
    const targetX = canvasBounds.x + canvasBounds.width / 2
    const targetY = canvasBounds.y + canvasBounds.height / 2
    await page.mouse.move(targetX - 50, targetY, { steps: 5 })
    await page.mouse.move(targetX, targetY, { steps: 5 })
    await page.mouse.up()

    // A node should now appear in the React Flow node layer
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 5000 })
  })

  test('dropped node has visible colored header', async ({ page }) => {
    const paletteItem = page.locator('[draggable="true"]').first()
    const canvas = page.locator('.react-flow__pane')
    const canvasBounds = await canvas.boundingBox()
    if (!canvasBounds) throw new Error('Canvas not found')
    const srcBounds = await paletteItem.boundingBox()
    if (!srcBounds) throw new Error('Palette item not found')

    await page.mouse.move(srcBounds.x + srcBounds.width / 2, srcBounds.y + srcBounds.height / 2)
    await page.mouse.down()
    const targetX = canvasBounds.x + canvasBounds.width / 2
    const targetY = canvasBounds.y + canvasBounds.height / 2
    await page.mouse.move(targetX, targetY, { steps: 10 })
    await page.mouse.up()

    const node = page.locator('.react-flow__node').first()
    await expect(node).toBeVisible({ timeout: 5000 })

    // Node should have non-zero dimensions (not blank/invisible)
    const nodeBounds = await node.boundingBox()
    expect(nodeBounds).not.toBeNull()
    expect(nodeBounds!.width).toBeGreaterThan(100)
    expect(nodeBounds!.height).toBeGreaterThan(30)

    // Node should contain some text (label or definitionId)
    const nodeText = await node.textContent()
    expect(nodeText?.trim().length).toBeGreaterThan(0)
  })

  test('clicking a node opens inspector panel', async ({ page }) => {
    // Drop a node first
    const paletteItem = page.locator('[draggable="true"]').first()
    const canvas = page.locator('.react-flow__pane')
    const canvasBounds = await canvas.boundingBox()
    if (!canvasBounds) throw new Error('Canvas not found')
    const srcBounds = await paletteItem.boundingBox()
    if (!srcBounds) throw new Error('Palette item not found')

    await page.mouse.move(srcBounds.x + srcBounds.width / 2, srcBounds.y + srcBounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(canvasBounds.x + canvasBounds.width / 2, canvasBounds.y + canvasBounds.height / 2, { steps: 10 })
    await page.mouse.up()

    const node = page.locator('.react-flow__node').first()
    await expect(node).toBeVisible({ timeout: 5000 })
    await node.click()

    // Inspector should show node config form
    await expect(page.locator('[data-testid="node-inspector"]')).toBeVisible({ timeout: 3000 })
  })

  test('clicking pane deselects node', async ({ page }) => {
    const paletteItem = page.locator('[draggable="true"]').first()
    const canvas = page.locator('.react-flow__pane')
    const canvasBounds = await canvas.boundingBox()
    if (!canvasBounds) throw new Error('Canvas not found')
    const srcBounds = await paletteItem.boundingBox()
    if (!srcBounds) throw new Error('Palette item not found')

    await page.mouse.move(srcBounds.x + srcBounds.width / 2, srcBounds.y + srcBounds.height / 2)
    await page.mouse.down()
    await page.mouse.move(canvasBounds.x + 300, canvasBounds.y + 200, { steps: 10 })
    await page.mouse.up()

    await page.locator('.react-flow__node').first().click()
    // Click empty area of pane (far corner)
    await page.mouse.click(canvasBounds.x + 50, canvasBounds.y + 50)
    // Inspector placeholder message should be visible (no node selected)
    await expect(page.locator('[data-testid="node-inspector"]').getByText(/select a node/i)).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Code tab', () => {
  test('switching to Code tab shows the code generation panel', async ({ page }) => {
    await page.goto('/pipeline/ml')
    await expect(page.locator('.react-flow')).toBeVisible()
    await page.getByRole('tab', { name: /code/i }).click()
    await expect(page.getByText(/generate/i).first()).toBeVisible()
  })
})

test.describe('Pipeline switching', () => {
  test('navigating ML → LLM resets palette to LLM nodes', async ({ page }) => {
    await page.goto('/pipeline/ml')
    await expect(page.getByText('ML Pipeline', { exact: false }).first()).toBeVisible()
    await page.getByText('LLM Pipeline').click()
    await expect(page).toHaveURL(/pipeline\/llm/)
    await expect(page.locator('[data-testid="node-palette"]')).toBeVisible()
  })
})
