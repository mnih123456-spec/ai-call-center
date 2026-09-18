const { createRequire } = require('module')
const path = require('path')
const fs = require('fs')

// Lokalny fallback dla Windows bez działającego natywnego unrs-resolver.
// Zostawiamy runner, transformacje i asercje Jesta; nie zmieniamy zależności.
const Resolver = require('jest-resolve').default
Resolver.findNodeModule = (name, options) => {
  try {
    const base = options.basedir || process.cwd()
    const req = createRequire(path.join(base, '__resolver__.cjs'))
    if (path.isAbsolute(name) || name.startsWith('.')) {
      const target = path.resolve(base, name)
      for (const ext of ['', '.ts', '.tsx', '.js', '.cjs', '.json', '/index.ts', '/index.js']) {
        if (fs.existsSync(target + ext) && fs.statSync(target + ext).isFile()) return target + ext
      }
    }
    return req.resolve(name)
  } catch { return null }
}
require('jest').run(['--runInBand', '--runTestsByPath',
  'src/modules/voicebot/commands/__tests__/campaigns.test.ts',
  'src/modules/voicebot/backend/__tests__/campaigns.test.tsx',
])
