import { ipcMain, dialog, app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

export function registerFileHandlers(): void {
  ipcMain.handle('open-file-dialog', async (_, filters?: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters ?? [],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(
    'save-file-dialog',
    async (_, { defaultPath, filters }: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
      const result = await dialog.showSaveDialog({
        defaultPath,
        filters: filters ?? [],
      })
      return result.canceled ? null : result.filePath
    }
  )

  ipcMain.handle('read-file', async (_, filePath: string) => {
    return fs.readFile(filePath, 'utf-8')
  })

  ipcMain.handle('write-file', async (_, { filePath, content }: { filePath: string; content: string }) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, content, 'utf-8')
  })

  ipcMain.handle('get-app-path', () => app.getPath('userData'))

  ipcMain.handle('get-version', () => app.getVersion())

  ipcMain.handle('get-backend-url', () => 'http://localhost:8000')

  ipcMain.handle('open-external', async (_, url: string) => {
    const { shell } = await import('electron')
    await shell.openExternal(url)
  })
}
