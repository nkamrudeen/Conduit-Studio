/**
 * make-icons.mjs — renders icon.svg to PNG sizes and builds ICO for Electron.
 * Uses Playwright's Chromium to render the SVG.
 */
import { createRequire } from 'module'
import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const _require = createRequire(import.meta.url)
const { chromium } = _require('C:/Users/reach/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ASSETS = path.join(ROOT, 'apps', 'desktop', 'assets')
mkdirSync(ASSETS, { recursive: true })

const svgPath = path.join(ROOT, 'apps', 'web', 'public', 'icon.svg')
const svgContent = readFileSync(svgPath, 'utf8')

const browser = await chromium.launch({
  executablePath: 'C:/Users/reach/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
  headless: true,
})

// Render SVG to PNG at multiple sizes
const sizes = [16, 32, 48, 64, 128, 256, 512]
const pngBuffers = {}

for (const size of sizes) {
  const ctx = await browser.newContext({ viewport: { width: size, height: size } })
  const page = await ctx.newPage()
  await page.setContent(`
    <html><body style="margin:0;padding:0;background:transparent">
      <img src="data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}"
           width="${size}" height="${size}" style="display:block"/>
    </body></html>`)
  await page.waitForTimeout(200)
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size }, omitBackground: true })
  pngBuffers[size] = buf
  await ctx.close()
  console.log(`  ✓  ${size}x${size} rendered`)
}

await browser.close()

// Save 256px PNG for Linux
writeFileSync(path.join(ASSETS, 'icon.png'), pngBuffers[256])
console.log('  ✓  icon.png saved')

// Build ICO file (Windows) — multi-size ICO
// ICO format: ICONDIR + ICONDIRENTRYs + image data
function buildIco(pngMap, icoSizes) {
  const images = icoSizes.map(s => pngMap[s])
  const count = images.length
  const headerSize = 6
  const entrySize = 16
  const dataOffset = headerSize + entrySize * count

  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0)     // reserved
  header.writeUInt16LE(1, 2)     // type: ICO
  header.writeUInt16LE(count, 4) // count

  const entries = []
  const dataBlocks = []
  let offset = dataOffset

  for (let i = 0; i < count; i++) {
    const size = icoSizes[i]
    const data = images[i]
    const entry = Buffer.alloc(entrySize)
    entry.writeUInt8(size === 256 ? 0 : size, 0)  // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1)  // height
    entry.writeUInt8(0, 2)                         // color count
    entry.writeUInt8(0, 3)                         // reserved
    entry.writeUInt16LE(1, 4)                      // planes
    entry.writeUInt16LE(32, 6)                     // bit count
    entry.writeUInt32LE(data.length, 8)            // size of image data
    entry.writeUInt32LE(offset, 12)                // offset
    entries.push(entry)
    dataBlocks.push(data)
    offset += data.length
  }

  return Buffer.concat([header, ...entries, ...dataBlocks])
}

const icoSizes = [16, 32, 48, 256]
const ico = buildIco(pngBuffers, icoSizes)
writeFileSync(path.join(ASSETS, 'icon.ico'), ico)
console.log('  ✓  icon.ico saved (', icoSizes.join(', '), 'px)')
console.log('\n🎉  Icons ready in', ASSETS)
