import { describe, expect, it } from '@jest/globals'
import { czyWartoZakladac, notatkaZRozmowy, type DanePolaczenia } from '../crm'

const rozmowa: DanePolaczenia = { phone: '+48500100200', direction: 'inbound' }

describe('czyWartoZakladac', () => {
  // Odmowa musi przeważyć nad każdym sygnałem sprzedażowym, żeby CRM respektował decyzję rozmówcy.
  it.each<Partial<DanePolaczenia>>([
    {}, { identityConfirmed: true }, { requestsContact: true },
    { productCode: 'KREDYT' }, { durationSecs: 300 },
    { identityConfirmed: true, requestsContact: true, productCode: 'KREDYT', durationSecs: 300 },
  ])('odmowa zgody blokuje utworzenie rekordu: %j', (sygnaly) => {
    expect(czyWartoZakladac({ ...rozmowa, ...sygnaly, consentGiven: false })).toBe(false)
  })

  // Każdy wartościowy sygnał wystarcza samodzielnie, nawet przy krótkiej rozmowie.
  it.each<Partial<DanePolaczenia>>([
    { identityConfirmed: true }, { requestsContact: true }, { productCode: 'KREDYT' },
  ])('przepuszcza samodzielny sygnał: %j', (sygnal) => {
    expect(czyWartoZakladac({ ...rozmowa, durationSecs: 2, ...sygnal })).toBe(true)
  })

  // Granica czasu odróżnia pusty telefon od rozmowy wartej zapisania.
  it.each([0, 2, 19])('pomija rozmowę bez ustaleń trwającą %i sekund', (durationSecs) => {
    expect(czyWartoZakladac({ ...rozmowa, durationSecs, productCode: 'NIEUSTALONY' })).toBe(false)
  })
  it('pomija rozmowę bez czasu i ustaleń', () => {
    expect(czyWartoZakladac(rozmowa)).toBe(false)
  })
  it.each([20, 120])('przepuszcza rozmowę trwającą %i sekund', (durationSecs) => {
    expect(czyWartoZakladac({ ...rozmowa, durationSecs })).toBe(true)
  })
})

describe('notatkaZRozmowy', () => {
  // Kierunek wyjaśnia handlowcowi, czy klient sam oddzwonił, czy odebrał nasz telefon.
  it.each([
    ['inbound', 'Rozmowa przychodząca (bot odebrał).'],
    ['outbound', 'Rozmowa wychodząca (bot dzwonił).'],
  ])('zawiera kierunek %s', (direction, tekst) => {
    expect(notatkaZRozmowy({ ...rozmowa, direction })).toBe(tekst)
  })

  // Puste dane nie powinny zaśmiecać notatki etykietami ani tekstem null/undefined.
  it('pomija pola puste i nieznane', () => {
    expect(notatkaZRozmowy({
      ...rozmowa, identityConfirmed: null, consentGiven: null, productCode: '',
      productDescription: '', bank: null, contractYear: '', amount: '', currency: null,
      requestsContact: null, preferredContactTime: '', durationSecs: null, summary: '',
    })).toBe('Rozmowa przychodząca (bot odebrał).')
  })

  // Podsumowanie wielowierszowe musi dotrzeć w całości, bo zawiera ustalenia z klientem.
  it('zachowuje pełne podsumowanie obok pozostałych danych', () => {
    const summary = 'Klient pyta o kredyt.\nProsi o ofertę w środę — po 15:00.'
    const notatka = notatkaZRozmowy({ ...rozmowa, productCode: 'KREDYT', durationSecs: 45, summary })
    expect(notatka).toContain('Produkt: KREDYT.')
    expect(notatka).toContain('Czas rozmowy: 45 s.')
    expect(notatka).toContain(`Podsumowanie: ${summary}`)
  })
})
