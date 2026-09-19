const path = require('node:path')
const Resolver = require('jest-resolve').default
const resolve = require('./test-resolver.cjs')

// Jest waliduje sciezke wlasnego resolvera jeszcze resolverem natywnym.
// Gdy binding Windows nie dziala, potrzebny jest ten sam fallback rowniez
// w fazie startu. Nie zmieniamy transformera ani asercji testow.
try {
  Resolver.findNodeModule('jest', { basedir: __dirname, throwIfNotFound: true })
} catch {
  Resolver.findNodeModule = (request, options) => {
    try { return resolve(request, options) }
    catch (error) {
      if (options.throwIfNotFound) throw error
      return null
    }
  }
}
require('jest').run(['--config', path.join(__dirname, 'jest.config.cjs'), '--runInBand', ...process.argv.slice(2)])
