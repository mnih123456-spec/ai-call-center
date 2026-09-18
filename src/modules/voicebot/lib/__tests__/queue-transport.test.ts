import { describe, expect, it } from '@jest/globals'
import { mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import { createQueue, type Queue } from '@open-mercato/queue'

describe('rzeczywisty transport kolejki frameworka', () => {
  it.each(['local', 'async'] as const)('%s zachowuje opoznienie i wykonuje kazde zadanie raz', async (strategy) => {
    // Wlasna nazwa i katalog: test nie dotyka zadnej kolejki aplikacji ani
    // dostawcy telefonow. Redis jest wylacznie lokalna instancja testowa.
    const name = `voicebot-c1-test-${crypto.randomUUID()}`
    const baseDir = await mkdtemp(path.join(__dirname, '.queue-test-'))
    const queue: Queue<{ index: number }> = strategy === 'local'
      ? createQueue(name, 'local', { baseDir, pollInterval: 25 })
      : createQueue(name, 'async', { connection: { host: '127.0.0.1', port: 6379 }, concurrency: 1 })
    const seen: Array<{ index: number; at: number }> = []
    const due: number[] = []
    let done!: () => void
    const completed = new Promise<void>((resolve) => { done = resolve })
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      for (let index = 0; index < 5; index++) {
        const delayMs = 200 + index * 200
        due[index] = Date.now() + delayMs
        await queue.enqueue({ index }, { delayMs })
      }
      await queue.process(async (job) => {
        seen.push({ index: job.payload.index, at: Date.now() })
        if (seen.length === 5) done()
      })
      await Promise.race([
        completed,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Queue transport timeout')), 10_000)
        }),
      ])
      expect(seen.map((item) => item.index)).toEqual([0, 1, 2, 3, 4])
      for (const item of seen) expect(item.at).toBeGreaterThanOrEqual(due[item.index])
    } finally {
      if (timer) clearTimeout(timer)
      await queue.close()
      if (strategy === 'async') {
        const cleanup = createQueue(name, 'async', { connection: { host: '127.0.0.1', port: 6379 } })
        try { await cleanup.clear() } finally { await cleanup.close() }
      }
      // Usuwamy tylko unikalny katalog utworzony przez mkdtemp w tym tescie.
      if (path.dirname(path.resolve(baseDir)) !== path.resolve(__dirname)) {
        throw new Error('Unexpected queue test directory')
      }
      await rm(baseDir, { recursive: true, force: true })
    }
  }, 15_000)
})
