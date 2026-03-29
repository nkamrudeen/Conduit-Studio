import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('aiide', {
  // File system
  openFile: (filters?: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('open-file-dialog', filters),
  saveFile: (defaultPath?: string, filters?: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('save-file-dialog', { defaultPath, filters }),
  readFile: (filePath: string) =>
    ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string) =>
    ipcRenderer.invoke('write-file', { filePath, content }),

  // App info
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Backend
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  checkBackendHealth: () => ipcRenderer.invoke('backend-health'),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Platform
  platform: process.platform,
})
