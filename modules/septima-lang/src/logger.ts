import fs from 'fs'

const LOG_FILE = '/tmp/septima-scanner.log'
export const logger = {
  info: (message: string) => {
    fs.appendFileSync(LOG_FILE, message + '\n')
  },

  reset: (message: string) => {
    fs.writeFileSync(LOG_FILE, message + '\n')
  },
}
logger.reset(`${''.padStart(40, '=')}\nStarting at ${new Date().toISOString()}\n${''.padStart(40, '=')}\n`)
