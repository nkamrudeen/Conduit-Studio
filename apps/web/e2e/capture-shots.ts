/**
 * Screenshot capture script — regenerates docs/shots/ and assembles demo.gif / demo.mp4
 *
 * Prerequisites:
 *   - App running: pnpm dev:web  (http://localhost:3000)
 *   - ffmpeg installed and on PATH
 *
 * Usage:
 *   cd apps/web
 *   pnpm capture-shots
 *
 * After it finishes, run:
 *   ffmpeg -f concat -safe 0 -i docs/shots/concat.txt \
 *          -vf "fps=1,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
 *          -loop 0 docs/demo.gif
 *
 *   ffmpeg -f concat -safe 0 -i docs/shots/concat.txt \
 *          -vf "fps=24,scale=960:-1" -c:v libx264 -pix_fmt yuv420p docs/demo.mp4
 */

import { test } from '@playwright/test'
import * as path from 'path'

const SHOTS_DIR = path.resolve(__dirname, '../../../docs/shots')

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.screenshot({ path: path.join(SHOTS_DIR, name), fullPage: false })
}

test('capture demo screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  // ------------------------------------------------------------------ 000: samples page
  await page.goto('/samples')
  await page.getByText('Sample Pipelines').waitFor({ state: 'visible' })
  await page.waitForTimeout(600)
  await shot(page, '000_samples_page.png')

  // ------------------------------------------------------------------ 001: open first ML sample
  await page.getByRole('button', { name: /Open in Canvas/i }).first().click()
  await page.locator('.react-flow').waitFor({ state: 'visible' })
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 8000 })
  await page.waitForTimeout(800)
  await shot(page, '001_ml_pipeline_loaded.png')

  // ------------------------------------------------------------------ 002: canvas overview (deselected)
  const pane = page.locator('.react-flow__pane')
  const pb = await pane.boundingBox()
  if (pb) await page.mouse.click(pb.x + 30, pb.y + 30)
  await page.waitForTimeout(400)
  await shot(page, '002_ml_pipeline_canvas.png')

  // ------------------------------------------------------------------ 003: inspector — first node
  await page.locator('.react-flow__node').first().click()
  await page.locator('[data-testid="node-inspector"]').waitFor({ state: 'visible' })
  await page.waitForTimeout(500)
  await shot(page, '003_ml_inspector_open.png')

  // ------------------------------------------------------------------ 004: inspector — middle node (e.g. transform)
  const nodeCount = await page.locator('.react-flow__node').count()
  await page.locator('.react-flow__node').nth(Math.floor(nodeCount / 2)).click()
  await page.waitForTimeout(500)
  await shot(page, '004_ml_inspector_middle_node.png')

  // ------------------------------------------------------------------ 005: code generation panel — Python
  await page.getByRole('tab', { name: /code/i }).click()
  await page.waitForTimeout(500)
  await shot(page, '005_ml_code_panel_python.png')

  // ------------------------------------------------------------------ 006: code generation panel — Notebook tab
  await page.getByRole('tab', { name: /notebook/i }).click()
  await page.waitForTimeout(400)
  await shot(page, '006_ml_code_panel_notebook.png')

  // ------------------------------------------------------------------ 007: integrations panel
  await page.getByRole('tab', { name: /^canvas/i }).click()
  await page.locator('button[title="Integrations"]').click()
  await page.getByRole('heading', { name: 'Integrations', exact: true }).waitFor({ state: 'visible', timeout: 3000 })
  await page.waitForTimeout(600)
  await shot(page, '007_integrations_panel.png')
  await page.locator('button[title="Integrations"]').click()

  // ------------------------------------------------------------------ 008: project files panel
  await page.locator('button[title="Project Files"]').click()
  await page.waitForTimeout(600)
  await shot(page, '008_project_files_panel.png')
  await page.locator('button[title="Project Files"]').click()

  // ------------------------------------------------------------------ 009: LLM pipeline — load sample
  await page.goto('/samples')
  await page.getByText('Sample Pipelines').waitFor({ state: 'visible' })
  await page.getByRole('button', { name: /LLM Pipelines/i }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Open in Canvas/i }).first().click()
  await page.locator('.react-flow').waitFor({ state: 'visible' })
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 8000 })
  await page.waitForTimeout(800)
  await shot(page, '009_llm_pipeline_loaded.png')

  // ------------------------------------------------------------------ 010: LLM node inspector
  await page.locator('.react-flow__node').first().click()
  await page.waitForTimeout(500)
  await shot(page, '010_llm_node_inspector.png')

  // ------------------------------------------------------------------ write concat.txt
  const fs = await import('fs')
  const shots = [
    ['000_samples_page.png', 2],
    ['001_ml_pipeline_loaded.png', 2],
    ['002_ml_pipeline_canvas.png', 2],
    ['003_ml_inspector_open.png', 2],
    ['004_ml_inspector_middle_node.png', 2],
    ['005_ml_code_panel_python.png', 2],
    ['006_ml_code_panel_notebook.png', 2],
    ['007_integrations_panel.png', 2],
    ['008_project_files_panel.png', 2],
    ['009_llm_pipeline_loaded.png', 2],
    ['010_llm_node_inspector.png', 2],
  ] as const

  const concatLines = shots
    .map(([f, d]) => `file '${SHOTS_DIR.replace(/\\/g, '/')}/${f}'\nduration ${d}`)
    .join('\n')
  fs.writeFileSync(path.join(SHOTS_DIR, 'concat.txt'), concatLines + '\n')
})
