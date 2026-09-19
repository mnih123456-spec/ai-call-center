import { describe, expect, it } from '@jest/globals'
import { statusZBledu } from '../rozmowa'

describe('statusZBledu', () => {
  it('zajęty po kodzie 486 albo słowie busy', () => {
    expect(statusZBledu('unexpected status from INVITE response: sip status: 486: Busy Here')).toBe('busy')
    expect(statusZBledu('SIP 600 Busy Everywhere')).toBe('busy')
  })

  it('nieodebrane po 480, 487, 408', () => {
    expect(statusZBledu('sip status: 480: Temporarily Unavailable')).toBe('no_answer')
    expect(statusZBledu('sip status: 487: Request Terminated')).toBe('no_answer')
    expect(statusZBledu('408 Request Timeout')).toBe('no_answer')
  })

  it('odmowa operatora i brak powodu to nieudane', () => {
    expect(statusZBledu('sip status: 403: Auth Failed (SIP 403)')).toBe('failed')
    expect(statusZBledu(null)).toBe('failed')
  })
})
