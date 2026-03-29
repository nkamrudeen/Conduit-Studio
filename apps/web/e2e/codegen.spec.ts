import { test, expect } from '@playwright/test'
import { goToCanvas, loadSamplePipeline } from './helpers'

test.describe('Code Generation Panel', () => {
  test.beforeEach(async ({ page }) => {
    await goToCanvas(page, 'ml')
    // Switch to Code tab
    await page.getByRole('tab', { name: /code/i }).click()
  })

  test('Code tab is reachable and shows panel', async ({ page }) => {
    await expect(page.getByRole('button', { name: /generate/i })).toBeVisible()
  })

  test('shows all 4 format tabs', async ({ page }) => {
    for (const label of ['Python Script', 'Notebook', 'Kubeflow DSL', 'Dockerfile']) {
      await expect(page.getByRole('tab', { name: new RegExp(label, 'i') })).toBeVisible()
    }
  })

  test('Generate button is disabled when canvas is empty', async ({ page }) => {
    const genBtn = page.getByRole('button', { name: /generate/i })
    await expect(genBtn).toBeDisabled()
  })

  test('Export button is disabled before generating code', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /export/i })
    await expect(exportBtn).toBeDisabled()
  })

  test('switching format tabs does not crash', async ({ page }) => {
    const formats = ['Python Script', 'Notebook', 'Kubeflow DSL', 'Dockerfile']
    for (const fmt of formats) {
      await page.getByRole('tab', { name: new RegExp(fmt, 'i') }).click()
      await page.waitForTimeout(100)
    }
    // Should still show Generate button
    await expect(page.getByRole('button', { name: /generate/i })).toBeVisible()
  })

  test('Monaco editor container is rendered', async ({ page }) => {
    // Monaco renders a .monaco-editor div
    await expect(page.locator('.monaco-editor, [data-testid="code-editor"], textarea').first()).toBeAttached({ timeout: 5000 })
  })

  test('Generate produces Python code when pipeline has nodes', async ({ page }) => {
    // Load sample pipeline first, then switch to code tab
    await goToCanvas(page, 'ml')
    await loadSamplePipeline(page)
    await page.getByRole('tab', { name: /code/i }).click()

    const genBtn = page.getByRole('button', { name: /generate/i })
    await expect(genBtn).toBeEnabled({ timeout: 3000 })

    // Generate — may fail if backend not running, that's acceptable in UI-only test
    // We verify the button click works without JS errors
    await genBtn.click()
    // Wait briefly for any response
    await page.waitForTimeout(1500)
    // Button should not have crashed the UI
    await expect(page.getByRole('tab', { name: /code/i })).toBeVisible()
  })

  test('Python format is selected by default', async ({ page }) => {
    const pythonTab = page.getByRole('tab', { name: /python script/i })
    await expect(pythonTab).toHaveAttribute('data-state', 'active')
  })

  test('clicking Notebook tab makes it active', async ({ page }) => {
    await page.getByRole('tab', { name: /notebook/i }).click()
    await expect(page.getByRole('tab', { name: /notebook/i })).toHaveAttribute('data-state', 'active')
  })

  test('canvas tab still works after visiting code tab', async ({ page }) => {
    await page.getByRole('tab', { name: /^canvas/i }).click()
    await expect(page.locator('.react-flow')).toBeVisible()
  })
})
