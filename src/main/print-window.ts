import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow, ipcMain, type IpcMainEvent } from 'electron'
import type { PaperSettingsRecord } from '../shared/print'

interface PrintWindowOptions {
  prescriptionId: number
  show: boolean
}

export function printPageSize(paper: PaperSettingsRecord): { width: number; height: number } {
  return {
    width: Math.round(paper.widthMm * 1000),
    height: Math.round(paper.heightMm * 1000)
  }
}

export async function createPrintWindow({ prescriptionId, show }: PrintWindowOptions): Promise<BrowserWindow> {
  const printWindow = new BrowserWindow({
    width: 980,
    height: 1200,
    show,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
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
  return printWindow
}
