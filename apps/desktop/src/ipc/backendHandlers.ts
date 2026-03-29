import { ipcMain } from 'electron'
import * as net from 'net'

export function registerBackendHandlers(): void {
  ipcMain.handle('backend-health', async () => {
    return new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ port: 8000, host: 'localhost' })

      const timer = setTimeout(() => {
        socket.destroy()
        resolve(false)
      }, 1000)

      socket.on('connect', () => {
        clearTimeout(timer)
        socket.destroy()
        resolve(true)
      })

      socket.on('error', () => {
        clearTimeout(timer)
        resolve(false)
      })
    })
  })
}
