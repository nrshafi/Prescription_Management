import type { WebContents } from 'electron'

const WINDOWS_SPOOLER_HINT =
  'Windows could not reach the Print Spooler (RPC server unavailable). Start the "Print Spooler" service in services.msc, or use Print Preview and press Ctrl+P, or export PDF.'

export function formatPrintSpoolerError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  const lower = raw.toLowerCase()
  if (
    lower.includes('enumerate printers') ||
    lower.includes('rpc server') ||
    lower.includes('0x6ba') ||
    lower.includes('print spooler')
  ) {
    return WINDOWS_SPOOLER_HINT
  }
  return raw || 'Printing failed.'
}

export async function assertPrintersAvailable(
  webContents: WebContents
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const printers = await webContents.getPrintersAsync()
    if (printers.length === 0) {
      return {
        ok: false,
        message:
          'No printers are installed on this PC. Use Print Preview (then Ctrl+P) or export PDF instead.'
      }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, message: formatPrintSpoolerError(err) }
  }
}
