import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import * as path from 'path'
import * as fs from 'fs'
import { spawn, ChildProcess } from 'child_process'
import { registerFileHandlers } from './ipc/fileHandlers'
import { registerBackendHandlers } from './ipc/backendHandlers'

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
    args = ['run', 'uvicorn', 'app.main:app', '--port', '8000']
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
    // Wait for backend to be ready before loading the app
    setTimeout(() => {
      const webAppPath = path.join(__dirname, '..', '..', 'web', 'dist', 'index.html')
      mainWindow?.loadFile(webAppPath)
    }, 2000)
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
