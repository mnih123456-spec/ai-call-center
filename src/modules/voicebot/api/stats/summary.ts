import { z } from 'zod'
import { naZlote, sumaUsd } from '../../lib/koszty'

export const statsSchema = z.object({
  total: z.number().int().nonnegative(),
  today: z.number().int().nonnegative(),
  week: z.number().int().nonnegative(),
  outbound: z.number().int().nonnegative(),
  completedOutbound: z.number().int().nonnegative(),
  successRate: z.number().nullable(),
  callbacks: z.number().int().nonnegative(),
  todayPln: z.string(),
  monthPln: z.string(),
  products: z.array(z.object({ code: z.string().nullable(), count: z.number().int().positive() })),
})

export type Stats = z.infer<typeof statsSchema>
export type StatsCall = {
  createdAt: Date
  direction: string
  status: string
  relatedCallId?: string | null
  productCode?: string | null
  costUsd?: string | null
}

const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
})

function dayKey(date: Date): string {
  const parts = calendar.formatToParts(date)
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('-')
}

export function summarizeCalls(rows: StatsCall[], now = new Date()): Stats {
  const today = dayKey(now)
  // Liczymy dni kalendarzowe w Polsce, niezależnie od strefy serwera i zmiany czasu.
  const monday = new Date(`${today}T12:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7)
  const weekStart = monday.toISOString().slice(0, 10)
  const monthStart = `${today.slice(0, 7)}-01`
  const products = new Map<string | null, number>()
  const todayCosts: Array<{ costUsd: string | null }> = []
  const monthCosts: Array<{ costUsd: string | null }> = []
  const result: Stats = {
    total: 0, today: 0, week: 0, outbound: 0, completedOutbound: 0,
    successRate: null, callbacks: 0, todayPln: '0.00', monthPln: '0.00', products: [],
  }
  for (const row of rows) {
    // Przyszłe zlecenia nie są jeszcze częścią historii rozmów.
    if (row.createdAt > now) continue
    const day = dayKey(row.createdAt)
    result.total++
    if (day === today) {
      result.today++
      todayCosts.push({ costUsd: row.costUsd ?? null })
    }
    if (day >= weekStart) result.week++
    if (day >= monthStart) monthCosts.push({ costUsd: row.costUsd ?? null })
    if (row.direction === 'outbound') {
      result.outbound++
      if (row.status === 'completed') result.completedOutbound++
    }
    if (row.direction === 'inbound' && row.relatedCallId) result.callbacks++
    const code = row.productCode || null
    products.set(code, (products.get(code) ?? 0) + 1)
  }
  result.successRate = result.outbound ? 100 * result.completedOutbound / result.outbound : null
  result.todayPln = naZlote(sumaUsd(todayCosts))
  result.monthPln = naZlote(sumaUsd(monthCosts))
  result.products = Array.from(products, ([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || (a.code ?? '').localeCompare(b.code ?? ''))
  return result
}
