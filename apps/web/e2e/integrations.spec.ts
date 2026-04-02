import { test, expect } from '@playwright/test'
import { goToCanvas } from './helpers'

// Helper: open the integrations panel and wait for it to be ready
async function openIntegrations(page: import('@playwright/test').Page) {
  await page.locator('button[title="Integrations"]').click()
  await page.getByRole('heading', { name: 'Integrations', exact: true }).waitFor({ state: 'visible', timeout: 3000 })
}

test.describe('Integrations Panel', () => {
  test.beforeEach(async ({ page }) => {
    await goToCanvas(page, 'ml')
  })

  test('integrations panel is hidden by default', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Integrations', exact: true })).not.toBeVisible()
  })

  test('clicking the integrations button opens the panel', async ({ page }) => {
    await openIntegrations(page)
    await expect(page.getByRole('heading', { name: 'Integrations', exact: true })).toBeVisible()
  })

  test('integrations panel shows all integration cards', async ({ page }) => {
    await openIntegrations(page)
    for (const name of ['MLflow', 'Kubeflow Pipelines', 'HuggingFace Hub', 'OpenAI', 'Anthropic', 'AWS S3']) {
      await expect(page.locator('p.text-xs.font-semibold', { hasText: name })).toBeVisible({ timeout: 3000 })
    }
  })

  test('each integration card has a Save button', async ({ page }) => {
    await openIntegrations(page)
    await page.waitForTimeout(300)
    const saveButtons = page.getByRole('button', { name: /^save$/i })
    const count = await saveButtons.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('MLflow card has tracking URI field', async ({ page }) => {
    await openIntegrations(page)
    await expect(page.getByPlaceholder(/localhost:5000/i)).toBeVisible({ timeout: 3000 })
  })

  test('HuggingFace card has token field', async ({ page }) => {
    await openIntegrations(page)
    await expect(page.getByPlaceholder(/hf_/i)).toBeVisible({ timeout: 3000 })
  })

  test('OpenAI card has API key field (password type)', async ({ page }) => {
    await openIntegrations(page)
    const apiKeyInput = page.getByPlaceholder(/sk-\.\.\./i)
    await expect(apiKeyInput).toBeVisible({ timeout: 3000 })
    await expect(apiKeyInput).toHaveAttribute('type', 'password')
  })

  test('filling and saving a credential stores it', async ({ page }) => {
    await openIntegrations(page)
    const trackingUri = page.getByPlaceholder(/localhost:5000/i)
    await trackingUri.fill('http://my-mlflow:5000')
    await page.getByRole('button', { name: /^save$/i }).first().click()
    await expect(page.getByText(/saved/i).first()).toBeVisible({ timeout: 2000 })
  })

  test('saved credentials persist after reopening the panel', async ({ page }) => {
    await openIntegrations(page)
    const trackingUri = page.getByPlaceholder(/localhost:5000/i)
    await trackingUri.fill('http://persistent:5000')
    await page.getByRole('button', { name: /^save$/i }).first().click()
    await page.waitForTimeout(300)

    // Close and reopen
    await page.locator('button[title="Integrations"]').click()
    await openIntegrations(page)

    await expect(page.getByPlaceholder(/localhost:5000/i)).toHaveValue('http://persistent:5000', { timeout: 2000 })
  })

  test('MLflow card has Test Connection button', async ({ page }) => {
    await openIntegrations(page)
    await expect(page.getByRole('button', { name: /test connection/i }).first()).toBeVisible({ timeout: 3000 })
  })

  test('documentation links are present', async ({ page }) => {
    await openIntegrations(page)
    const links = page.locator('a[target="_blank"]')
    const count = await links.count()
    expect(count).toBeGreaterThan(0)
  })

  test('closing the panel hides integrations content', async ({ page }) => {
    await openIntegrations(page)
    await page.locator('button[title="Integrations"]').click()
    await expect(page.getByRole('heading', { name: 'Integrations', exact: true })).not.toBeVisible({ timeout: 3000 })
  })

  test('integrations panel does not obscure the canvas', async ({ page }) => {
    await openIntegrations(page)
    await expect(page.locator('.react-flow')).toBeVisible()
  })

  test('panel is scrollable to show all integrations', async ({ page }) => {
    await openIntegrations(page)
    const awsHeading = page.locator('p.text-xs.font-semibold', { hasText: 'AWS S3' })
    await awsHeading.scrollIntoViewIfNeeded()
    await expect(awsHeading).toBeVisible({ timeout: 3000 })
  })
})
