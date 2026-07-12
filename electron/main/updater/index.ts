import { BrowserWindow } from 'electron'
import electronLog from 'electron-log'
import { autoUpdater } from 'electron-updater'
import { logsRepo } from '../db'

export type UpdaterStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string; releaseNotes?: string | null }
  | { state: 'not-available' }
  | { state: 'downloading'; percent: number }
  | { state: 'downloaded'; version: string }
  | { state: 'error'; message: string }

let status: UpdaterStatus = { state: 'idle' }

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:status', status)
  }
}

export function getUpdaterStatus(): UpdaterStatus {
  return status
}

export function setupAutoUpdater(autoCheck: boolean): void {
  autoUpdater.logger = electronLog
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    status = { state: 'checking' }
    broadcast()
  })
  autoUpdater.on('update-available', (info) => {
    status = {
      state: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null
    }
    broadcast()
    logsRepo.add({
      category: 'system',
      level: 'info',
      message: `Update available: ${info.version}`
    })
  })
  autoUpdater.on('update-not-available', () => {
    status = { state: 'not-available' }
    broadcast()
  })
  autoUpdater.on('download-progress', (p) => {
    status = { state: 'downloading', percent: p.percent }
    broadcast()
  })
  autoUpdater.on('update-downloaded', (info) => {
    status = { state: 'downloaded', version: info.version }
    broadcast()
  })
  autoUpdater.on('error', (err) => {
    status = { state: 'error', message: err.message }
    broadcast()
    logsRepo.add({
      category: 'error',
      level: 'error',
      message: `Updater error: ${err.message}`
    })
  })

  if (autoCheck && process.env.NODE_ENV === 'production') {
    void autoUpdater.checkForUpdates().catch(() => undefined)
  }
}

export async function checkForUpdates(): Promise<UpdaterStatus> {
  try {
    status = { state: 'checking' }
    broadcast()
    await autoUpdater.checkForUpdates()
  } catch (err) {
    status = {
      state: 'error',
      message: err instanceof Error ? err.message : String(err)
    }
    broadcast()
  }
  return status
}

export async function downloadUpdate(): Promise<void> {
  await autoUpdater.downloadUpdate()
}

export function installUpdate(): void {
  autoUpdater.quitAndInstall()
}
