import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import * as path from 'path'
import * as fs from 'fs'
import * as http from 'http'
import { spawn, ChildProcess } from 'child_process'
import { registerFileHandlers } from './ipc/fileHandlers'
import { registerBackendHandlers } from './ipc/backendHandlers'

app.name = 'ConduitCraft AI'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null
let webServer: http.Server | null = null
let webServerPort = 0
const backendLogs: string[] = []   // rolling last 100 lines of backend output

// ── Static file server for the bundled web app ───────────────────────────────
// Serving via http://localhost avoids all file:// CORS / crossorigin issues
// that cause Vite's ES module scripts to be silently blocked (white/blank page).

const MIME: Record<string, string> = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':  'font/ttf',
}

function startWebServer(webRoot: string): Promise<number> {
  return new Promise((resolve, reject) => {
    webServer = http.createServer((req, res) => {
      let urlPath = (req.url ?? '/').split('?')[0]
      // SPA fallback: any path without an extension serves index.html
      const ext = path.extname(urlPath)
      if (!ext) urlPath = '/index.html'

      const filePath = path.join(webRoot, urlPath)
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404)
          res.end('Not found')
          return
        }
        const mime = MIME[path.extname(filePath)] ?? 'application/octet-stream'
        res.writeHead(200, { 'Content-Type': mime })
        res.end(data)
      })
    })

    webServer.listen(0, '127.0.0.1', () => {
      const addr = webServer!.address() as { port: number }
      resolve(addr.port)
    })

    webServer.on('error', reject)
  })
}

// ── Backend ───────────────────────────────────────────────────────────────────

function getBackendDir(): string {
  if (isDev) {
    return path.join(__dirname, '..', '..', '..', 'backend')
  }
  return path.join(process.resourcesPath, 'backend')
}

function spawnBackend(): void {
  const backendDir = getBackendDir()

  if (!fs.existsSync(backendDir)) {
    console.warn(`Backend directory not found: ${backendDir}`)
    return
  }

  let cmd: string
  let args: string[]
  let cwd: string | undefined

  if (isDev) {
    const uvPath = process.platform === 'win32' ? 'uv.exe' : 'uv'
    cmd = uvPath
    args = ['run', 'uvicorn', 'app.main:app', '--port', '8000', '--loop', 'asyncio']
    cwd = backendDir
  } else {
    const exeName = process.platform === 'win32' ? 'conduit-backend.exe' : 'conduit-backend'
    cmd = path.join(backendDir, exeName)
    args = ['8000']
    cwd = backendDir   // must run from its own dir so relative data files resolve
  }

  backendProcess = spawn(cmd, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  })

  backendProcess.on('error', (err) => {
    if (isDev) {
      console.log(`uv spawn failed (${err.message}), falling back to python...`)
      const pythonPath = process.platform === 'win32' ? 'python' : 'python3'
      backendProcess = spawn(pythonPath, ['-m', 'uvicorn', 'app.main:app', '--port', '8000'], {
        cwd: backendDir,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
      })
      attachBackendListeners()
    } else {
      console.error(`Failed to start bundled backend: ${err.message}`)
    }
  })

  attachBackendListeners()
}

function attachBackendListeners(): void {
  if (!backendProcess) return

  const appendLog = (line: string) => {
    backendLogs.push(line)
    if (backendLogs.length > 100) backendLogs.shift()
  }

  backendProcess.stdout?.on('data', (data: Buffer) => {
    const line = data.toString().trim()
    console.log(`[backend] ${line}`)
    appendLog(line)
  })

  backendProcess.stderr?.on('data', (data: Buffer) => {
    const line = data.toString().trim()
    console.error(`[backend:err] ${line}`)
    appendLog(line)
  })

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`)
    backendProcess = null
  })
}

// ── Health polling ────────────────────────────────────────────────────────────

function waitForBackend(url: string, timeoutMs = 60_000, intervalMs = 500): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume()
        resolve(true)
      })
      req.on('error', () => {
        if (Date.now() < deadline) setTimeout(attempt, intervalMs)
        else resolve(false)
      })
      req.setTimeout(intervalMs, () => {
        req.destroy()
        if (Date.now() < deadline) setTimeout(attempt, intervalMs)
        else resolve(false)
      })
    }
    attempt()
  })
}

// ── Window ────────────────────────────────────────────────────────────────────

function createWindow(): void {
  const iconPath = isDev
    ? path.join(__dirname, '..', 'assets', 'icon.ico')
    : path.join(__dirname, '..', 'assets', 'icon.ico')

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    if (isDev) mainWindow?.webContents.openDevTools()
  })

  mainWindow.on('closed', () => { mainWindow = null })

  if (isDev) {
    setTimeout(() => mainWindow?.loadURL('http://localhost:3001'), 2000)
    return
  }

  // Show splash immediately
  mainWindow.loadURL(`data:text/html;charset=utf-8,<html><body style="margin:0;background:%230a0a0a;
    display:flex;align-items:center;justify-content:center;height:100vh;
    font-family:system-ui;color:%236366f1"><div style="text-align:center">
    <div style="font-size:22px;font-weight:600;margin-bottom:6px">ConduitCraft AI</div>
    <div style="font-size:11px;color:%236366f1;letter-spacing:0.04em;margin-bottom:10px">Craft Your Pipelines. Ship Your Models.</div>
    <div style="font-size:13px;color:%236b7280">Starting...</div>
    </div></body></html>`)

  waitForBackend('http://localhost:8000/health').then((ready) => {
    if (!mainWindow) return
    if (ready) {
      mainWindow.loadURL(`http://127.0.0.1:${webServerPort}/`)
    } else {
      const logText = backendLogs.length
        ? backendLogs.slice(-30).join('\n')
        : 'No output captured — the executable may be missing or blocked by antivirus.'

      const escapedLog = logText
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      const backendExe = path.join(getBackendDir(),
        process.platform === 'win32' ? 'conduit-backend.exe' : 'conduit-backend')
      const exeExists = fs.existsSync(backendExe)
      const hint = exeExists
        ? 'The backend executable was found but failed to run.'
        : `Executable not found at:<br><code style="font-size:10px">${backendExe}</code><br>Run <b>pyinstaller conduit-backend.spec</b> then rebuild the app.`

      mainWindow.loadURL(`data:text/html;charset=utf-8,<!DOCTYPE html><html><body style="margin:0;background:%230a0a0a;
        display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;
        font-family:system-ui;color:%23ef4444;padding:24px;box-sizing:border-box">
        <div style="max-width:720px;width:100%;text-align:center">
          <div style="font-size:18px;font-weight:700;margin-bottom:6px">Backend failed to start</div>
          <div style="font-size:12px;color:%236b7280;margin-bottom:16px">${hint}</div>
          <pre style="text-align:left;background:%230f0f1a;border:1px solid %23333;border-radius:8px;
            padding:12px;font-size:10px;color:%23a1a1aa;overflow:auto;max-height:300px;white-space:pre-wrap">${escapedLog}</pre>
          <div style="margin-top:16px;display:flex;gap:10px;justify-content:center">
            <button onclick="location.reload()" style="padding:8px 20px;border-radius:6px;
              background:%237c3aed;color:white;border:none;font-size:13px;cursor:pointer">
              Retry
            </button>
            <button onclick="window.open('mailto:?subject=ConduitCraft+Error&body='+encodeURIComponent(document.querySelector('pre').textContent))"
              style="padding:8px 20px;border-radius:6px;background:%231a1a2e;color:%236b7280;
              border:1px solid %23333;font-size:13px;cursor:pointer">
              Copy Logs
            </button>
          </div>
        </div></body></html>`)
    }
  })
}

// ── Auto-updater ──────────────────────────────────────────────────────────────

function setupAutoUpdater(): void {
  if (isDev) return
  autoUpdater.checkForUpdatesAndNotify()
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info', title: 'Update Available',
      message: 'A new version of ConduitCraft AI is available. It will be downloaded in the background.',
      buttons: ['OK'],
    })
  })
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'question', title: 'Update Ready',
      message: 'A new version has been downloaded. Restart the application to apply the update.',
      buttons: ['Restart Now', 'Later'],
    }).then(({ response }) => { if (response === 0) autoUpdater.quitAndInstall() })
  })
  autoUpdater.on('error', (err) => console.error('Auto-updater error:', err))
}

function killBackend(): void {
  if (backendProcess) { backendProcess.kill(); backendProcess = null }
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  registerFileHandlers()
  registerBackendHandlers()

  if (!isDev) {
    const webRoot = path.join(process.resourcesPath, 'web')
    webServerPort = await startWebServer(webRoot)
    console.log(`[web] Serving ${webRoot} on http://127.0.0.1:${webServerPort}`)
  }

  spawnBackend()
  createWindow()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    killBackend()
    webServer?.close()
    app.quit()
  }
})

app.on('before-quit', () => { killBackend(); webServer?.close() })
app.on('will-quit', () => { killBackend(); webServer?.close() })
