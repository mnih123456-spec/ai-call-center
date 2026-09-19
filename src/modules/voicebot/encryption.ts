import type { ModuleEncryptionMap } from '@open-mercato/shared/modules/encryption'

/**
 * Szyfrowanie danych w spoczynku dla tego modułu.
 *
 * Szyfrujemy dokładnie jedno pole: `webhook_url` w połączeniu z CRM klienta.
 * Ten adres zawiera w ścieżce żeton dostępowy, czyli jest hasłem do całego
 * CRM-u firmy. Kto go ma, może czytać i zmieniać dane wszystkich jej
 * klientów. To jedyna rzecz w tym module, której wyciek z kopii bazy byłby
 * natychmiastową szkodą dla firmy-klienta, a nie tylko dla nas.
 *
 * Czego świadomie NIE szyfrujemy i dlaczego:
 *
 * `phone` przy rozmowie zostaje jawny, bo po nim szukamy wcześniejszej próby
 * przy oddzwonieniu, po nim sortujemy i po nim filtruje się lista w panelu.
 * Kolumna z szyfrogramem nie obsłuży żadnej z tych rzeczy: porównanie
 * zwykłego numeru z szyfrogramem nigdy nie trafi. Gdyby numery miały być
 * szyfrowane, trzeba by dołożyć pole skrótu do wyszukiwania i przepisać
 * dopasowywanie oddzwonień. To osobna decyzja, nie skutek uboczny.
 *
 * `summary` i `extra_notes` zawierają treść rozmowy z klientem i są
 * kandydatami na kolejny krok, ale dziś nie są ani wyszukiwane, ani
 * eksportowane, więc zostawiam to do świadomej decyzji, zamiast zaszyfrować
 * po cichu pole, które ktoś jutro zechce przeszukiwać.
 *
 * Uwaga wdrożeniowa: te wpisy materializują się dla nowych tenantów
 * automatycznie, a dla istniejących dopiero po uruchomieniu
 * `yarn mercato entities seed-encryption --tenant <id>`.
 */
export const defaultEncryptionMaps: ModuleEncryptionMap[] = [
  {
    entityId: 'voicebot:voice_crm_connection',
    fields: [{ field: 'webhook_url' }],
  },
]

export default defaultEncryptionMaps
