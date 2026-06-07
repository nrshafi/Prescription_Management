import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow, type IpcMainEvent, ipcMain } from 'electron'
import type { PaperSettingsRecord } from '../shared/print'

interface PrintWindowOptions {
  prescriptionId: number
  show: boolean
  paintForPdf?: boolean
}

export function printPageSize(paper: PaperSettingsRecord): { width: number; height: number } {
  return {
    width: Math.round(paper.widthMm * 1000),
    height: Math.round(paper.heightMm * 1000)
  }
}

export async function createPrintWindow({
  prescriptionId,
  show,
  paintForPdf = false
}: PrintWindowOptions): Promise<BrowserWindow> {
  const printWindow = new BrowserWindow({
    width: 980,
    height: 1200,
    show: show || paintForPdf,
    x: paintForPdf ? -2000 : undefined,
    y: paintForPdf ? -2000 : undefined,
    autoHideMenuBar: true,
    skipTaskbar: paintForPdf,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      backgroundThrottling: false
    }
  })

  const ready = new Promise<void>((resolve) => {
    const handler = (event: IpcMainEvent) => {
      if (event.sender !== printWindow.webContents) return
      ipcMain.off('printing:ready', handler)
      resolve()
    }
    ipcMain.on('printing:ready', handler)
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    await printWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}/print?id=${prescriptionId}`)
  } else {
    await printWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { printPrescriptionId: String(prescriptionId) }
    })
  }

  await ready
  await waitForPrintContent(printWindow)

  if (paintForPdf) {
    printWindow.showInactive()
    printWindow.focus()
    await delay(150)
  }

  try {
    await printWindow.webContents.capturePage()
  } catch {
    // Best-effort paint before print/PDF.
  }
  return printWindow
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForPrintContent(printWindow: BrowserWindow): Promise<void> {
  await printWindow.webContents.executeJavaScript(
    `new Promise((resolve) => {
      const finish = () => resolve(true)
      const started = performance.now()
      const tick = () => {
        const root = document.querySelector('[data-print-content]')
        if (root && root.textContent && root.textContent.trim().length > 0) {
          requestAnimationFrame(() => requestAnimationFrame(finish))
          return
        }
        if (performance.now() - started > 8000) {
          finish()
          return
        }
        requestAnimationFrame(tick)
      }
      tick()
    })`,
    true
  )
}