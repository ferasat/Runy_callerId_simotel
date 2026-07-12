import { Menu, Tray, app, nativeImage, BrowserWindow } from 'electron'
import { join } from 'path'
import type { CallService } from '../services/callService'

let tray: Tray | null = null

function trayIcon(): Electron.NativeImage {
  // 16x16 simple generated icon fallback
  const size = 16
  const buf = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const inCircle = (x - 7.5) ** 2 + (y - 7.5) ** 2 <= 36
      buf[i] = inCircle ? 34 : 0
      buf[i + 1] = inCircle ? 197 : 0
      buf[i + 2] = inCircle ? 94 : 0
      buf[i + 3] = inCircle ? 255 : 0
    }
  }
  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

export function createTray(opts: {
  getMainWindow: () => BrowserWindow | null
  callService: CallService
}): Tray {
  if (tray) return tray
  tray = new Tray(trayIcon())
  tray.setToolTip('سیموتل سافت‌فون')

  const rebuild = (): void => {
    const active = opts.callService.getActive()
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'نمایش سافت‌فون',
        click: () => {
          const win = opts.getMainWindow()
          win?.show()
          win?.focus()
        }
      },
      { type: 'separator' }
    ]

    if (active) {
      template.push({
        label: `فعال: ${active.callerName ?? active.phoneNumber}`,
        enabled: false
      })
      if (active.state === 'ringing' && active.direction === 'inbound') {
        template.push({
          label: 'پاسخ',
          click: () => opts.callService.answer()
        })
        template.push({
          label: 'رد',
          click: () => opts.callService.reject()
        })
      }
      template.push({ type: 'separator' })
    }

    template.push({
      label: 'خروج',
      click: () => {
        ;(app as unknown as { isQuitting?: boolean }).isQuitting = true
        app.quit()
      }
    })

    tray?.setContextMenu(Menu.buildFromTemplate(template))
  }

  rebuild()
  tray.on('double-click', () => {
    const win = opts.getMainWindow()
    win?.show()
    win?.focus()
  })

  setInterval(rebuild, 2000)
  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

export function trayResourcesPath(): string {
  return join(app.getAppPath(), 'resources', 'icons')
}
