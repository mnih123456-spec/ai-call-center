const path = require('node:path')
const base = require('../../../jest.config.cjs')

// Szablon wskazuje nieistniejacy jest.setup.ts, wiec nie uzywamy jego setupu.
// Doladowujemy za to dopasowania jest-dom, bo testy ekranow ich uzywaja
// (toHaveValue, toBeInTheDocument). Bez tego padaja z komunikatem, ktory
// wyglada na blad logiki, a jest brakiem biblioteki dopasowan.
module.exports = {
  ...base,
  rootDir: path.resolve(__dirname, '../../..'),
  roots: ['<rootDir>/src/modules/voicebot'],
  setupFilesAfterEnv: [require.resolve('@testing-library/jest-dom')],
  passWithNoTests: false,
  resolver: path.join(__dirname, 'test-resolver.cjs'),
}
