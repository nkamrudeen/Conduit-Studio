import { test, expect } from '@playwright/test'
import { goToCanvas } from './helpers'

test.describe('Integrations Panel', () => {
  test.beforeEach(async ({ page }) => {
    await goToCanvas(page, 'ml')
  })

  test('integrations panel is hidden by default', async ({ page }) => {
    await expect(page.getByText('Integrations').first()).not.toBeVisible()
  })

  test('clicking the GitBranch/integrations button opens the panel', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    await expect(page.getByText('Integrations').first()).toBeVisible({ timeout: 2000 })
  })

  test('integrations panel shows all integration cards', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    for (const name of ['MLflow', 'Kubeflow Pipelines', 'HuggingFace Hub', 'OpenAI', 'Anthropic', 'AWS S3']) {
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 3000 })
    }
  })

  test('each integration card has a Save button', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    await page.waitForTimeout(300)
    const saveButtons = page.getByRole('button', { name: /^save$/i })
    const count = await saveButtons.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('MLflow card has tracking URI field', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    await expect(page.getByPlaceholder(/localhost:5000/i)).toBeVisible({ timeout: 3000 })
  })

  test('HuggingFace card has token field', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    await expect(page.getByPlaceholder(/hf_/i)).toBeVisible({ timeout: 3000 })
  })

  test('OpenAI card has API key field (password type)', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    const apiKeyInput = page.getByPlaceholder(/sk-\.\.\./i)
    await expect(apiKeyInput).toBeVisible({ timeout: 3000 })
    await expect(apiKeyInput).toHaveAttribute('type', 'password')
  })

  test('filling and saving a credential stores it', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    const trackingUri = page.getByPlaceholder(/localhost:5000/i)
    await trackingUri.fill('http://my-mlflow:5000')
    // Click MLflow's Save button (first Save button)
    await page.getByRole('button', { name: /^save$/i }).first().click()
    // Should briefly show "Saved" text
    await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 2000 })
  })

  test('saved credentials persist after reopening the panel', async ({ page }) => {
    // Open and fill
    await page.locator('button[title="Integrations"]').click()
    const trackingUri = page.getByPlaceholder(/localhost:5000/i)
    await trackingUri.fill('http://persistent:5000')
    await page.getByRole('button', { name: /^save$/i }).first().click()
    await page.waitForTimeout(300)

    // Close and reopen
    await page.locator('button[title="Integrations"]').click() // closes
    await page.locator('button[title="Integrations"]').click() // reopens

    await expect(page.getByPlaceholder(/localhost:5000/i)).toHaveValue('http://persistent:5000', { timeout: 2000 })
  })

  test('MLflow card has Test Connection button', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    await expect(page.getByRole('button', { name: /test connection/i }).first()).toBeVisible({ timeout: 3000 })
  })

  test('documentation links are present', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    // External link icons should be present
    const links = page.locator('a[target="_blank"]')
    const count = await links.count()
    expect(count).toBeGreaterThan(0)
  })

  test('closing the panel hides integrations content', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    await expect(page.getByText('MLflow')).toBeVisible({ timeout: 2000 })
    // Click X to close
    await page.locator('button[title="Integrations"]').click()
    await expect(page.getByText('MLflow')).not.toBeVisible({ timeout: 2000 })
  })

  test('integrations panel does not obscure the canvas', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    // Canvas should still be visible
    await expect(page.locator('.react-flow')).toBeVisible()
  })

  test('panel is scrollable to show all integrations', async ({ page }) => {
    await page.locator('button[title="Integrations"]').click()
    // Scroll to bottom to verify AWS S3 is reachable
    await page.getByText('AWS S3').scrollIntoViewIfNeeded()
    await expect(page.getByText('AWS S3')).toBeVisible({ timeout: 3000 })
  })
})
