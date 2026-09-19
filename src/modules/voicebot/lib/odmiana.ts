import Anthropic from '@anthropic-ai/sdk'
import { createLogger } from '@open-mercato/shared/lib/logger'
import { dopelniaczRegula } from './odmiana-regula'

const logger = createLogger('voicebot')

/**
 * Nazwa firmy w dopełniaczu.
 *
 * Bot mówi "wirtualna asystentka Kancelarii Bankowej", nie "asystentka
 * Kancelaria Bankowa". Polska odmiana nazw własnych nie da się zrobić regułą
 * na dowolną nazwę: "Kancelaria Bankowa" odmienia się, "Solar Nowak" nie,
 * "Auto-Serwis Kowalski i Wspólnicy" częściowo. Odmianę robi model
 * językowy, raz, przy zakładaniu bota i przy zapisie pytań. Gdy modelu nie ma
 * albo nie odpowie, zostaje mianownik, tak jak było.
 */
const pamiec = new Map<string, string>()

const POLECENIE = `Podajesz polską nazwę firmy w dopełniaczu, tak jak w zdaniu "wirtualna asystentka ...". Odmieniasz tylko te człony, które po polsku się odmieniają: rzeczowniki pospolite i przymiotniki w nazwie ("Kancelaria Bankowa" -> "Kancelarii Bankowej", "Warsztat Kowalski" -> "Warsztatu Kowalskiego", "Gabinet Zdrowy Uśmiech" -> "Gabinetu Zdrowy Uśmiech"). Nazwisk, marek, skrótów i słów obcych nie odmieniasz ("Solar Nowak" -> "Solar Nowak", "AdSignio" -> "AdSignio", "Kancelaria Nowak i Wspólnicy" -> "Kancelarii Nowak i Wspólnicy"). Zwracasz wyłącznie odmienioną nazwę, bez cudzysłowu, bez kropki, bez komentarza.`

export async function nazwaWDopelniaczu(nazwa: string): Promise<string> {
  const czysta = nazwa.trim()
  if (!czysta) return czysta
  const zPamieci = pamiec.get(czysta)
  if (zPamieci) return zPamieci

  // Regula idzie pierwsza: jest przewidywalna i nie wymaga klucza. Model
  // dostaje tylko nazwy, ktorych regula nie rozpoznala.
  const zReguly = dopelniaczRegula(czysta)
  if (zReguly !== czysta) return zReguly

  const apiKey = process.env.VOICEBOT_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey) return czysta

  try {
    const client = new Anthropic({ apiKey })
    const odp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      system: POLECENIE,
      messages: [{ role: 'user', content: czysta }],
    })
    const tekst = odp.content
      .map((c) => (c.type === 'text' ? c.text : ''))
      .join('')
      .trim()
      .replace(/^["„]|["”]$/g, '')
      .replace(/\.$/, '')
    // Odpowiedz w innej dlugosci niz nazwa to znak, ze model dopisal komentarz.
    // Wtedy lepiej zostawic mianownik niz wstawic do powitania zdanie modelu.
    if (!tekst || tekst.length > czysta.length * 2 + 10 || /\n/.test(tekst)) {
      logger.warn('name declension rejected', { nazwa: czysta })
      return czysta
    }
    pamiec.set(czysta, tekst)
    logger.info('name declined', { nazwa: czysta, dopelniacz: tekst })
    return tekst
  } catch {
    logger.warn('name declension failed', { nazwa: czysta })
    return czysta
  }
}
