import { test, expect } from '@playwright/test'
import { goToCanvas, loadSamplePipeline } from './helpers'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'

test.describe('File Browser Panel', () => {
  test.beforeEach(async ({ page }) => {
    await goToCanvas(page, 'ml')
  })

  test('Project Files button is visible in header', async ({ page }) => {
    await expect(page.locator('button[title="Project Files"]')).toBeVisible()
  })

  test('clicking Project Files button opens the file browser panel', async ({ page }) => {
    await page.locator('button[title="Project Files"]').click()
    await expect(page.getByText(/project files/i).first()).toBeVisible({ timeout: 2000 })
  })

  test('file browser panel shows project folder path input', async ({ page }) => {
    await page.locator('button[title="Project Files"]').click()
    await expect(page.getByPlaceholder(/project folder/i)).toBeVisible({ timeout: 3000 })
  })

  test('closing file browser hides panel', async ({ page }) => {
    await page.locator('button[title="Project Files"]').click()
    await expect(page.getByText(/project files/i).first()).toBeVisible({ timeout: 2000 })
    // Click the close (X) button
    await page.locator('button[title="Project Files"]').click()
    await expect(page.getByPlaceholder(/project folder/i)).not.toBeVisible({ timeout: 2000 })
  })

  test('file browser panel does not obscure the canvas', async ({ page }) => {
    await page.locator('button[title="Project Files"]').click()
    await expect(page.locator('.react-flow')).toBeVisible()
  })
})

test.describe('Canvas Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await goToCanvas(page, 'ml')
  })

  test('toolbar is visible', async ({ page }) => {
    await expect(page.locator('.react-flow')).toBeVisible()
    // Pipeline name input
    await expect(page.locator('input[defaultValue], input').first()).toBeVisible()
  })

  test('shows node and edge count', async ({ page }) => {
    await expect(page.getByText(/nodes/i).first()).toBeVisible()
  })

  test('Run button is disabled with empty canvas', async ({ page }) => {
    const runBtn = page.getByRole('button', { name: /run/i })
    await expect(runBtn).toBeDisabled()
  })

  test('Run button enables after adding a node', async ({ page }) => {
    await loadSamplePipeline(page)
    const runBtn = page.getByRole('button', { name: /run/i })
    await expect(runBtn).toBeEnabled({ timeout: 3000 })
  })

  test('loading a sample from Samples page populates canvas', async ({ page }) => {
    await expect(page.locator('.react-flow__node')).toHaveCount(0)
    await loadSamplePipeline(page)
    const count = await page.locator('.react-flow__node').count()
    expect(count).toBeGreaterThan(3)
  })

  test('sample pipeline has edges connecting nodes', async ({ page }) => {
    await loadSamplePipeline(page)
    const edges = await page.locator('.react-flow__edge').count()
    expect(edges).toBeGreaterThan(0)
  })

  test('node and edge counter updates after loading sample', async ({ page }) => {
    await loadSamplePipeline(page)
    // Counter should show more than 0 nodes
    await expect(page.getByText(/[1-9]\d* nodes/i)).toBeVisible({ timeout: 3000 })
  })

  test('Reset button clears all nodes', async ({ page }) => {
    await loadSamplePipeline(page)
    const before = await page.locator('.react-flow__node').count()
    expect(before).toBeGreaterThan(0)
    await page.getByRole('button', { name: /reset/i }).click()
    await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 3000 })
  })

  test('Save button downloads a JSON file', async ({ page }) => {
    await loadSamplePipeline(page)
    // Listen for download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /save/i }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.json$/)
  })

  test('Load button opens file picker', async ({ page }) => {
    // Check Load button exists and has a hidden file input
    await expect(page.getByRole('button', { name: /load/i })).toBeVisible()
    await expect(page.locator('input[type="file"]')).toBeAttached()
  })

  test('Load button restores a saved pipeline', async ({ page }) => {
    await loadSamplePipeline(page)
    const nodeBefore = await page.locator('.react-flow__node').count()

    // Download the pipeline
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /save/i }).click(),
    ])
    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename())
    await download.saveAs(tmpPath)

    // Reset, then load
    await page.getByRole('button', { name: /reset/i }).click()
    await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 3000 })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: /load/i }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles(tmpPath)

    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 5000 })
    const nodeAfter = await page.locator('.react-flow__node').count()
    expect(nodeAfter).toBe(nodeBefore)

    fs.unlinkSync(tmpPath)
  })
})
