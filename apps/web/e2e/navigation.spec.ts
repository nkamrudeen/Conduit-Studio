import { test, expect } from '@playwright/test'
import { goToCanvas } from './helpers'

test.describe('Navigation & Layout', () => {
  test('/ redirects to /pipeline/ml', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/pipeline\/ml/, { timeout: 5000 })
  })

  test('IDE header is always visible', async ({ page }) => {
    await page.goto('/pipeline/ml')
    await expect(page.getByText('AI-IDE')).toBeVisible()
  })

  test('header shows subtitle text', async ({ page }) => {
    await page.goto('/pipeline/ml')
    await expect(page.getByText(/MLOps/i)).toBeVisible()
  })

  test('ML Pipeline nav tab is active on /pipeline/ml', async ({ page }) => {
    await page.goto('/pipeline/ml')
    const mlTab = page.getByRole('link', { name: /ML Pipeline/i })
    await expect(mlTab).toHaveClass(/bg-primary|text-primary-foreground/, { timeout: 3000 })
  })

  test('LLM Pipeline nav tab is active on /pipeline/llm', async ({ page }) => {
    await page.goto('/pipeline/llm')
    const llmTab = page.getByRole('link', { name: /LLM Pipeline/i })
    await expect(llmTab).toHaveClass(/bg-primary|text-primary-foreground/, { timeout: 3000 })
  })

  test('clicking ML Pipeline tab navigates to /pipeline/ml', async ({ page }) => {
    await page.goto('/pipeline/llm')
    await page.getByRole('link', { name: /ML Pipeline/i }).click()
    await expect(page).toHaveURL(/pipeline\/ml/)
  })

  test('clicking LLM Pipeline tab navigates to /pipeline/llm', async ({ page }) => {
    await page.goto('/pipeline/ml')
    await page.getByRole('link', { name: /LLM Pipeline/i }).click()
    await expect(page).toHaveURL(/pipeline\/llm/)
  })

  test('switching ML → LLM resets the canvas', async ({ page }) => {
    await goToCanvas(page, 'ml')
    await page.getByRole('button', { name: /sample/i }).click()
    await expect(page.locator('.react-flow__node').first()).toBeVisible({ timeout: 5000 })

    // Switch to LLM
    await page.getByRole('link', { name: /LLM Pipeline/i }).click()
    await expect(page).toHaveURL(/pipeline\/llm/)
    // Canvas should be empty after reset
    await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 3000 })
  })

  test('switching LLM → ML resets the canvas', async ({ page }) => {
    await goToCanvas(page, 'llm')
    await page.getByRole('link', { name: /ML Pipeline/i }).click()
    await expect(page).toHaveURL(/pipeline\/ml/)
    await expect(page.locator('.react-flow__node')).toHaveCount(0, { timeout: 3000 })
  })

  test('3-panel layout: palette | canvas | inspector all visible', async ({ page }) => {
    await page.goto('/pipeline/ml')
    await expect(page.locator('[data-testid="node-palette"]')).toBeVisible()
    await expect(page.locator('.react-flow')).toBeVisible()
    await expect(page.locator('[data-testid="node-inspector"]')).toBeVisible()
  })

  test('page title contains AI-IDE', async ({ page }) => {
    await page.goto('/pipeline/ml')
    await expect(page).toHaveTitle(/AI-IDE/)
  })

  test('Plugins button is visible in header', async ({ page }) => {
    await page.goto('/pipeline/ml')
    await expect(page.locator('button[title="Plugins"]')).toBeVisible()
  })

  test('Integrations button is visible in header', async ({ page }) => {
    await page.goto('/pipeline/ml')
    await expect(page.locator('button[title="Integrations"]')).toBeVisible()
  })

  test('Settings button is visible in header', async ({ page }) => {
    await page.goto('/pipeline/ml')
    await expect(page.locator('button[title="Settings"]')).toBeVisible()
  })

  test('unknown route falls back gracefully', async ({ page }) => {
    await page.goto('/this-route-does-not-exist')
    // Should either redirect or show something without a crash
    await expect(page.locator('body')).toBeVisible()
  })
})
