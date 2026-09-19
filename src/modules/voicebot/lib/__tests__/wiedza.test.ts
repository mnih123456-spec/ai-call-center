import { describe, expect, it } from '@jest/globals'
import { ocenAdres, wytnijTekst } from '../wiedza'

describe('ocenAdres', () => {
  it.each([
    'https://kancelaria-gryf.pl',
    'http://przyklad.pl/o-nas',
    'https://sub.przyklad.com.pl/strona?a=1',
  ])('przepuszcza publiczny adres %s', (adres) => {
    expect(ocenAdres(adres).ok).toBe(true)
  })

  // Adres podaje firma-klient, a pobiera go nasz serwer. Bez tej listy klient
  // pytalby przez nas o rzeczy widoczne tylko z naszej maszyny.
  it.each([
    'http://localhost:3000/api/voicebot/agents',
    'http://127.0.0.1/',
    'http://10.0.0.5/',
    'http://192.168.1.1/',
    'http://172.16.0.1/',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/',
    'http://baza.local/',
  ])('odrzuca adres z sieci wewnetrznej %s', (adres) => {
    expect(ocenAdres(adres).ok).toBe(false)
  })

  it.each(['file:///C:/Windows/win.ini', 'ftp://przyklad.pl/', 'javascript:alert(1)'])(
    'odrzuca protokol inny niz http %s',
    (adres) => {
      expect(ocenAdres(adres).ok).toBe(false)
    },
  )

  it.each(['', '   ', 'twojafirma', 'to nie jest adres'])('odrzuca smiec %p', (adres) => {
    expect(ocenAdres(adres).ok).toBe(false)
  })

  it('przycina biale znaki wokol adresu', () => {
    const wynik = ocenAdres('  https://przyklad.pl/o-nas  ')
    expect(wynik.ok).toBe(true)
    if (wynik.ok) expect(wynik.adres.hostname).toBe('przyklad.pl')
  })
})

describe('wytnijTekst', () => {
  // Skrypty i style to najwiekszy kawalek typowej strony. Gdyby weszly do
  // modelu, placilibysmy za czytanie kodu zamiast tresci.
  it('wyrzuca skrypty, style i komentarze', () => {
    const html = `
      <html><head><title>Firma</title><style>body{color:red}</style></head>
      <body><script>var a = "O nas ukryte"</script>
      <!-- komentarz -->
      <p>Pomagamy klientom bankow.</p></body></html>`
    const tekst = wytnijTekst(html)
    expect(tekst).toContain('Pomagamy klientom bankow.')
    expect(tekst).not.toContain('color:red')
    expect(tekst).not.toContain('var a')
    expect(tekst).not.toContain('komentarz')
  })

  // Bez tego naglowek sklejalby sie ze zdaniem z akapitu obok i model
  // czytalby zlepki w rodzaju "Cennik Analiza umowy kosztuje".
  it('rozdziela bloki nowym wierszem', () => {
    expect(wytnijTekst('<h1>Cennik</h1><p>Analiza umowy</p><p>Pozew</p>')).toBe(
      'Cennik\nAnaliza umowy\nPozew',
    )
  })

  it('zamienia lamanie wiersza na nowy wiersz', () => {
    expect(wytnijTekst('<p>Poniedzialek<br>Wtorek</p>')).toBe('Poniedzialek\nWtorek')
  })

  it('odkodowuje encje', () => {
    expect(wytnijTekst('<p>Kowalski &amp; Wspolnicy &#8222;Gryf&#8221;</p>')).toBe(
      'Kowalski & Wspolnicy „Gryf”',
    )
  })

  it('scala nadmiarowe spacje i pomija puste wiersze', () => {
    expect(wytnijTekst('<p>  Dwie   spacje  </p><p></p><p>Koniec</p>')).toBe('Dwie spacje\nKoniec')
  })

  it('nie przewraca sie na pustym wejsciu', () => {
    expect(wytnijTekst('')).toBe('')
    expect(wytnijTekst('<html><body></body></html>')).toBe('')
  })
})
