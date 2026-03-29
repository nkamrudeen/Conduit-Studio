/**
 * capture-demo.mjs — Conduit Studio screenshot capture + GIF/MP4 assembly.
 *
 * Prereq: static server already running at http://localhost:4173
 * Usage:  node scripts/capture-demo.mjs
 */

import { createRequire } from 'module'
import { execSync } from 'child_process'
import { mkdirSync, readdirSync, unlinkSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const _require = createRequire(import.meta.url)
const { chromium } = _require('C:/Users/reach/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT       = path.resolve(__dirname, '..')
const SHOTS_DIR  = path.join(ROOT, 'docs', 'shots')
const OUT_DIR    = path.join(ROOT, 'docs')
const FFMPEG     = 'C:/Users/reach/AppData/Local/Temp/node_modules/ffmpeg-static/ffmpeg.exe'
const BASE_URL   = 'http://localhost:4173'

mkdirSync(SHOTS_DIR, { recursive: true })
mkdirSync(OUT_DIR,   { recursive: true })
for (const f of readdirSync(SHOTS_DIR)) unlinkSync(path.join(SHOTS_DIR, f))

// ── helpers ──────────────────────────────────────────────────────────────────

let idx = 0
async function shot(page, label) {
  const file = path.join(SHOTS_DIR, `${String(idx++).padStart(3,'0')}_${label}.png`)
  await page.screenshot({ path: file })
  console.log(`  📸  ${path.basename(file)}`)
}
const wait = ms => new Promise(r => setTimeout(r, ms))

// ── verify server ─────────────────────────────────────────────────────────────
console.log(`\n🔗  Connecting to ${BASE_URL}…`)
for (let i = 0; i < 20; i++) {
  try { const r = await fetch(BASE_URL); if (r.ok) break } catch {}
  await wait(500)
}
console.log('  ✓  Server up')

// ── browser ───────────────────────────────────────────────────────────────────
const browser = await chromium.launch({
  executablePath: 'C:/Users/reach/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--force-device-scale-factor=1'],
})
const ctx  = await browser.newContext({ viewport: { width: 1440, height: 860 }, colorScheme: 'dark' })
const page = await ctx.newPage()
page.on('console', () => {})
page.on('pageerror', () => {})

try {

  // ── 1. Samples page ───────────────────────────────────────────────────────
  console.log('\n🎬  Samples page')
  await page.goto(`${BASE_URL}/samples`, { waitUntil: 'networkidle' })
  await wait(800)
  await shot(page, 'samples_page')

  // ── 2. Open first ML sample ───────────────────────────────────────────────
  console.log('\n🎬  Load ML sample pipeline')
  const openBtn = page.locator('button').filter({ hasText: /open/i }).first()
  if (await openBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await openBtn.click()
  } else {
    // Fallback: click the first sample card's arrow/button
    await page.locator('[class*="card"], article, .rounded').first().click()
  }
  // Should now be on /pipeline/ml
  await page.waitForURL(/pipeline\/(ml|llm)/, { timeout: 8000 }).catch(() => {})
  await page.waitForSelector('.react-flow__node', { timeout: 8000 }).catch(() => {})
  await wait(900)
  await shot(page, 'ml_pipeline_loaded')

  // ── 3. Fit view and capture full canvas ───────────────────────────────────
  console.log('\n🎬  Full ML pipeline canvas')
  await wait(400)
  await shot(page, 'ml_pipeline_canvas')

  // ── 4. Click a node → inspector ───────────────────────────────────────────
  console.log('\n🎬  Node selected + Inspector')
  const nodes = page.locator('.react-flow__node')
  const nodeCount = await nodes.count()
  if (nodeCount > 0) {
    await nodes.nth(0).click()
    await wait(600)
    await shot(page, 'ml_inspector_open')

    // Click a different node (middle of pipeline)
    if (nodeCount > 2) {
      await nodes.nth(Math.floor(nodeCount / 2)).click()
      await wait(500)
      await shot(page, 'ml_inspector_middle_node')
    }
  }

  // ── 5. Right-click context menu ───────────────────────────────────────────
  console.log('\n🎬  Right-click context menu')
  if (nodeCount > 0) {
    await nodes.nth(1 % nodeCount).click({ button: 'right' })
    await wait(500)
    await shot(page, 'ml_context_menu_node')
    await page.keyboard.press('Escape')
    await wait(200)
  }

  // Right-click an edge if any
  const edges = page.locator('.react-flow__edge')
  const edgeCount = await edges.count()
  if (edgeCount > 0) {
    const edgeEl = edges.first()
    const box = await edgeEl.boundingBox()
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' })
      await wait(500)
      await shot(page, 'ml_context_menu_edge')
      await page.keyboard.press('Escape')
      await wait(200)
    }
  }

  // ── 6. Validate pipeline ──────────────────────────────────────────────────
  console.log('\n🎬  Validate pipeline')
  const validateBtn = page.locator('button').filter({ hasText: /validate/i }).first()
  if (await validateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await validateBtn.click()
    await wait(600)
    await shot(page, 'ml_validate_result')
    // Dismiss
    await page.keyboard.press('Escape')
    await wait(200)
  }

  // ── 7. Code generation panel ──────────────────────────────────────────────
  console.log('\n🎬  Code generation panel')
  await page.getByRole('tab', { name: /code/i }).click().catch(() => {})
  await wait(500)
  const genBtn = page.locator('button').filter({ hasText: /generate/i }).first()
  if (await genBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await genBtn.click()
    await wait(1500)
  }
  await shot(page, 'ml_code_panel')

  // Switch back to Canvas
  await page.getByRole('tab', { name: /canvas/i }).click().catch(() => {})
  await wait(300)

  // ── 8. LLM Pipeline — load sample ────────────────────────────────────────
  console.log('\n🎬  LLM Pipeline sample')
  await page.goto(`${BASE_URL}/samples`, { waitUntil: 'networkidle' })
  await wait(500)
  // Switch to LLM tab on samples page
  const llmTabBtn = page.locator('button').filter({ hasText: /llm/i }).first()
  if (await llmTabBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await llmTabBtn.click()
    await wait(400)
  }
  await shot(page, 'llm_samples_page')

  const llmOpenBtn = page.locator('button').filter({ hasText: /open/i }).first()
  if (await llmOpenBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await llmOpenBtn.click()
    await page.waitForURL(/pipeline\/llm/, { timeout: 8000 }).catch(() => {})
    await page.waitForSelector('.react-flow__node', { timeout: 8000 }).catch(() => {})
    await wait(900)
    await shot(page, 'llm_pipeline_loaded')

    const llmNodes = page.locator('.react-flow__node')
    if ((await llmNodes.count()) > 0) {
      await llmNodes.first().click()
      await wait(500)
      await shot(page, 'llm_node_inspector')
    }
  }

  // ── 9. Help page ──────────────────────────────────────────────────────────
  console.log('\n🎬  Help page')
  await page.goto(`${BASE_URL}/help`, { waitUntil: 'networkidle' })
  await wait(600)
  await shot(page, 'help_page')

  // ── 10. Plugins page ──────────────────────────────────────────────────────
  console.log('\n🎬  Plugins page')
  await page.goto(`${BASE_URL}/plugins`, { waitUntil: 'networkidle' })
  await wait(600)
  await shot(page, 'plugins_page')

  console.log(`\n✅  ${idx} screenshots → ${SHOTS_DIR}`)

} finally {
  await browser.close()
}

// ── assemble GIF + MP4 ────────────────────────────────────────────────────────
const palette = path.join(SHOTS_DIR, 'palette.png')
const gifOut  = path.join(OUT_DIR, 'demo.gif')
const mp4Out  = path.join(OUT_DIR, 'demo.mp4')

console.log('\n🎞   Building GIF…')
execSync(
  `"${FFMPEG}" -y -framerate 0.5 -pattern_type glob -i "${SHOTS_DIR}/*.png" ` +
  `-vf "fps=0.5,scale=1200:-2:flags=lanczos,palettegen=max_colors=192:stats_mode=diff" "${palette}"`,
  { stdio: 'inherit' }
)
execSync(
  `"${FFMPEG}" -y -framerate 0.5 -pattern_type glob -i "${SHOTS_DIR}/*.png" ` +
  `-i "${palette}" ` +
  `-lavfi "fps=0.5,scale=1200:-2:flags=lanczos [x]; [x][1:v] paletteuse=dither=sierra2_4a" ` +
  `"${gifOut}"`,
  { stdio: 'inherit' }
)
console.log(`  ✓  GIF → ${gifOut}`)

console.log('\n🎞   Building MP4…')
execSync(
  `"${FFMPEG}" -y -framerate 0.4 -pattern_type glob -i "${SHOTS_DIR}/*.png" ` +
  `-vf "scale=1440:-2:flags=lanczos,format=yuv420p" ` +
  `-c:v libx264 -preset slow -crf 22 -movflags +faststart "${mp4Out}"`,
  { stdio: 'inherit' }
)
console.log(`  ✓  MP4 → ${mp4Out}`)
console.log('\n🎉  Done!')
