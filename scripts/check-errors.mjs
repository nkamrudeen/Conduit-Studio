import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
const { chromium } = _require('C:/Users/reach/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright')

const browser = await chromium.launch({
  executablePath: 'C:/Users/reach/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
  headless: true,
})
const page = await browser.newPage({ viewport: { width: 1440, height: 860 }, colorScheme: 'dark' })

const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push(e.message))

await page.goto('http://localhost:4173/pipeline/ml', { waitUntil: 'networkidle' })
await new Promise(r => setTimeout(r, 3000))

// Screenshot to see what's on screen
await page.screenshot({ path: 'c:/projects/ai-ide/docs/debug_ml.png' })

const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 800))
console.log('=== Page text ===\n', bodyText)
console.log('=== Console errors ===\n', errors)

// Check /samples too
await page.goto('http://localhost:4173/samples', { waitUntil: 'networkidle' })
await new Promise(r => setTimeout(r, 2000))
await page.screenshot({ path: 'c:/projects/ai-ide/docs/debug_samples.png' })

await browser.close()
