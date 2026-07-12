import { app, BrowserWindow, screen } from 'electron'
import electronLog from 'electron-log'
import { join } from 'path'
import { closeDatabase, openDatabase, settingsRepo, logsRepo } from './db'
import { registerIpcHandlers } from './ipc/handlers'
import { CallService, createMainWindow, createPopupWindow } from './services/callService'
import { createTray, destroyTray } from './tray'
import { setupAutoUpdater } from './updater'

electronLog.transports.file.level = 'info'
Object.assign(console, electronLog.functions)

let mainWindow: BrowserWindow | null = null
let popupWindow: BrowserWindow | null = null
let callService: CallService

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function getPopupWindow(): BrowserWindow | null {
  return popupWindow
}

function showPopup(): void {
  if (!popupWindow || popupWindow.isDestroyed()) {
    popupWindow = createPopupWindow()
  }
  const display = screen.getPrimaryDisplay().workArea
  const bounds = popupWindow.getBounds()
  popupWindow.setPosition(
    display.x + display.width - bounds.width - 24,
    display.y + display.height - bounds.height - 24
  )
  popupWindow.show()
  popupWindow.focus()
}

function hidePopup(): void {
  popupWindow?.hide()
}

app.whenReady().then(() => {
  openDatabase()
  const settings = settingsRepo.get()
  electronLog.transports.file.level = settings.logLevel

  callService = new CallService({ getMainWindow, getPopupWindow, showPopup })

  registerIpcHandlers({
    getMainWindow,
    getPopupWindow,
    showPopup,
    hidePopup,
    callService
  })

  mainWindow = createMainWindow()
  popupWindow = createPopupWindow()
  createTray({ getMainWindow, callService })
  setupAutoUpdater(settings.autoCheckUpdates)

  if (settings.startWithWindows) {
    app.setLoginItemSettings({ openAtLogin: true, openAsHidden: settings.autoStart })
  }

  logsRepo.add({
    category: 'system',
    level: 'info',
    message: 'Application started',
    meta: { version: app.getVersion(), env: process.env.NODE_ENV }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow()
    } else {
      mainWindow?.show()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray if configured
    const settings = settingsRepo.get()
    if (!settings.minimizeToTray) app.quit()
  }
})

app.on('before-quit', () => {
  ;(app as unknown as { isQuitting?: boolean }).isQuitting = true
  destroyTray()
  closeDatabase()
})

// Ensure single instance
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

export { join }
