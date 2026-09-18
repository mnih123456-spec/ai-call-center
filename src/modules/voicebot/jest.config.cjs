const path = require('node:path')
const base = require('../../../jest.config.cjs')

// Szablon wskazuje nieistniejacy jest.setup.ts. Te testy nie potrzebuja
// globalnych efektow, wiec zachowujemy jego transformer i pomijamy setup.
module.exports = {
  ...base,
  rootDir: path.resolve(__dirname, '../../..'),
  roots: ['<rootDir>/src/modules/voicebot'],
  setupFilesAfterEnv: [],
  passWithNoTests: false,
  resolver: path.join(__dirname, 'test-resolver.cjs'),
}
