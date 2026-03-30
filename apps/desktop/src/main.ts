import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import * as path from 'path'
import * as fs from 'fs'
import { spawn, ChildProcess } from 'child_process'
import { registerFileHandlers } from './ipc/fileHandlers'
import { registerBackendHandlers } from './ipc/backendHandlers'

app.name = 'Conduit Studio'

const isDev = process.env.NODE_ENV === 'development'
let mainWindow: BrowserWindow | null = null
let backendProcess: ChildProcess | null = null

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
    // Development: run via uv (or fall back to python) from the source tree
    const uvPath = process.platform === 'win32' ? 'uv.exe' : 'uv'
    cmd = uvPath
    args = ['run', 'uvicorn', 'app.main:app', '--port', '8000', '--loop', 'asyncio']
    cwd = backendDir
  } else {
    // Production: launch the PyInstaller self-contained executable
    const exeName = process.platform === 'win32' ? 'conduit-backend.exe' : 'conduit-backend'
    cmd = path.join(backendDir, exeName)
    args = ['8000']
    cwd = undefined
  }

  backendProcess = spawn(cmd, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  })

  backendProcess.on('error', (err) => {
    if (isDev) {
      // uv not found — fall back to system python
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

  backendProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[backend] ${data.toString().trim()}`)
  })

  backendProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[backend:err] ${data.toString().trim()}`)
  })

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`)
    backendProcess = null
  })
}

async function waitForBackend(
  url: string,
  timeoutMs = 60_000,
  intervalMs = 500,
): Promise<boolean> {
  const http = await import('http')
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume()
        resolve(true)
      })
      req.on('error', () => {
        if (Date.now() < deadline) {
          setTimeout(attempt, intervalMs)
        } else {
          resolve(false)
        }
      })
      req.setTimeout(intervalMs, () => {
        req.destroy()
        if (Date.now() < deadline) {
          setTimeout(attempt, intervalMs)
        } else {
          resolve(false)
        }
      })
    }
    attempt()
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    show: false,
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
    if (isDev) {
      mainWindow?.webContents.openDevTools()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (isDev) {
    setTimeout(() => {
      mainWindow?.loadURL('http://localhost:3001')
    }, 2000)
  } else {
    // Poll the backend health endpoint instead of using a fixed delay.
    // PyInstaller bundles can take 10-30s to extract and start uvicorn.
    const webAppPath = path.join(process.resourcesPath, 'web', 'index.html')

    // Show a loading screen immediately so the window isn't blank
    mainWindow.loadURL(`data:text/html,
      <html><body style="margin:0;background:#0a0a0a;display:flex;align-items:center;
        justify-content:center;height:100vh;font-family:system-ui;color:#6366f1">
        <div style="text-align:center">
          <div style="font-size:22px;font-weight:600;margin-bottom:8px">Conduit Studio</div>
          <div style="font-size:13px;color:#6b7280">Starting backend server…</div>
        </div>
      </body></html>`)

    mainWindow.once('ready-to-show', () => mainWindow?.show())

    waitForBackend('http://localhost:8000/health').then((ready) => {
      if (!mainWindow) return
      if (ready) {
        mainWindow.loadFile(webAppPath)
      } else {
        mainWindow.loadURL(`data:text/html,
          <html><body style="margin:0;background:#0a0a0a;display:flex;align-items:center;
            justify-content:center;height:100vh;font-family:system-ui;color:#ef4444">
            <div style="text-align:center">
              <div style="font-size:18px;font-weight:600;margin-bottom:8px">Backend failed to start</div>
              <div style="font-size:12px;color:#6b7280">Check that port 8000 is not in use and try restarting.</div>
            </div>
          </body></html>`)
      }
    })
  }
}

function setupAutoUpdater(): void {
  if (isDev) return

  autoUpdater.checkForUpdatesAndNotify()

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: 'A new version of Conduit Studio is available. It will be downloaded in the background.',
      buttons: ['OK'],
    })
  })

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'question',
        title: 'Update Ready',
        message: 'A new version has been downloaded. Restart the application to apply the update.',
        buttons: ['Restart Now', 'Later'],
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err)
  })
}

function killBackend(): void {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
}

app.whenReady().then(() => {
  registerFileHandlers()
  registerBackendHandlers()

  spawnBackend()
  createWindow()
  setupAutoUpdater()

  app.on('activate', () => {
    // On macOS, recreate the window when the dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  // On macOS, apps stay active until Cmd+Q is pressed
  if (process.platform !== 'darwin') {
    killBackend()
    app.quit()
  }
})

app.on('before-quit', () => {
  killBackend()
})

app.on('will-quit', () => {
  killBackend()
})
