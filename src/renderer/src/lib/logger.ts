import { invoke } from '@tauri-apps/api/core'

type Level = 'info' | 'warn' | 'error' | 'debug'

const isDev = import.meta.env.DEV

type LogContext = Record<string, unknown>

function toConsole(level: Level, message: string, context?: LogContext): void {
  if (!isDev) return
  if (context !== undefined) {
    switch (level) {
      case 'info':
        console.info(message, context)
        return
      case 'warn':
        console.warn(message, context)
        return
      case 'error':
        console.error(message, context)
        return
      case 'debug':
        console.debug(message, context)
        return
    }
    return
  }
  switch (level) {
    case 'info':
      console.info(message)
      return
    case 'warn':
      console.warn(message)
      return
    case 'error':
      console.error(message)
      return
    case 'debug':
      console.debug(message)
      return
  }
}

async function forward(level: Level, message: string, context?: LogContext): Promise<void> {
  try {
    await invoke('log_event', {
      event: { level, message, context: context ?? null }
    })
  } catch {
    // Never let a logging failure bubble up to the caller. The dev console
    // (if enabled) already captured the message; in prod there is nothing
    // more to do.
  }
}

export const logger = {
  info: (message: string, context?: LogContext): void => {
    toConsole('info', message, context)
  },
  warn: (message: string, context?: LogContext): void => {
    toConsole('warn', message, context)
  },
  error: (message: string, context?: LogContext): void => {
    toConsole('error', message, context)
    void forward('error', message, context)
  },
  debug: (message: string, context?: LogContext): void => {
    toConsole('debug', message, context)
  }
}

export async function invokeLogged<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(cmd, args)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error(`invoke failed: ${cmd}`, {
      command: cmd,
      message,
      argKeys: args ? Object.keys(args) : []
    })
    throw err
  }
}
