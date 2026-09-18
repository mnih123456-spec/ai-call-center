/** @jest-environment jsdom */
import * as React from 'react'
import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { apiCall, type ApiCallResult } from '@open-mercato/ui/backend/utils/apiCall'
import { createCrud, updateCrud } from '@open-mercato/ui/backend/utils/crud'
import CampaignsPage from '../page'

jest.mock('@open-mercato/shared/lib/i18n/context', () => {
  const t = (_key: string, fallback: string) => fallback
  return { useT: () => t }
})
jest.mock('@open-mercato/ui/backend/utils/apiCall', () => ({ apiCall: jest.fn() }))
jest.mock('@open-mercato/ui/backend/utils/crud', () => ({ createCrud: jest.fn(), updateCrud: jest.fn() }))
jest.mock('@open-mercato/ui/backend/Page', () => ({
  Page: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  PageBody: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  PageHeader: ({ actions }: { actions: React.ReactNode }) => <div>{actions}</div>,
}))
jest.mock('@open-mercato/ui/backend/DataTable', () => ({
  DataTable: ({ columns, data }: { columns: { id?: string; cell?: (ctx: unknown) => React.ReactNode }[]; data: { id: string }[] }) => (
    <div>{data.map((row) => <div key={row.id}>{columns.find((c) => c.id === 'edit')?.cell?.({ row: { original: row } })}</div>)}</div>
  ),
}))
jest.mock('@open-mercato/ui/backend/CrudForm', () => ({
  // Atrapa ogranicza test do mapowania danych strony, bez testowania biblioteki UI.
  CrudForm: ({ fields, initialValues, onSubmit, extraActions }: {
    fields: { id: string; label: string; type: string; options?: { value: string; label: string }[] }[]
    initialValues: Record<string, unknown>
    onSubmit: (values: Record<string, unknown>) => Promise<void>
    extraActions: React.ReactNode
  }) => {
    const [values, setValues] = React.useState(initialValues)
    return <div>{fields.map((field) => <label key={field.id}>{field.label}
      {field.type === 'select' ? <select value={String(values[field.id] ?? '')} onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}>
        {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select> : <input value={String(values[field.id] ?? '')} onChange={(e) => setValues({ ...values, [field.id]: e.target.value })} />}
    </label>)}<button onClick={() => void onSubmit(values).catch(() => {})}>Zapisz</button>{extraActions}</div>
  },
}))

const row = {
  id: '12345678-1234-4234-8234-123456789012', name: 'Kampania', agentId: 'agent-2', phoneNumberId: 'number-2',
  status: 'paused', minIntervalSecs: 25, updatedAt: '2026-09-18T10:00:00.000Z',
}
const catalog = {
  configured: true,
  agents: [{ agentId: 'agent-1', name: 'Pierwszy' }, { agentId: 'agent-2', name: 'Drugi' }],
  numbers: [{ phoneNumberId: 'number-1', phoneNumber: '+48500100100', provider: '' }, { phoneNumberId: 'number-2', phoneNumber: '+48500200200', provider: '' }],
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(apiCall).mockImplementation(async <T,>(url: Parameters<typeof apiCall>[0]) => ({ ok: true, status: 200, result: String(url).includes('/provider') ? catalog : { items: [row] } }) as ApiCallResult<T>)
  jest.mocked(updateCrud).mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof updateCrud>>)
})

describe('formularz edycji kampanii', () => {
  it('odtwarza zapisane wybory i wysyła nowy numer, agenta oraz status z wersją', async () => {
    render(<CampaignsPage />)
    fireEvent.click(await screen.findByText('Edytuj'))
    expect(screen.getByLabelText('Agent')).toHaveValue('agent-2')
    expect(screen.getByLabelText('Numer wychodzący')).toHaveValue('number-2')
    expect(screen.getByLabelText('Status')).toHaveValue('paused')
    fireEvent.change(screen.getByLabelText('Agent'), { target: { value: 'agent-1' } })
    fireEvent.change(screen.getByLabelText('Numer wychodzący'), { target: { value: 'number-1' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'running' } })
    fireEvent.click(screen.getByText('Zapisz'))
    await waitFor(() => expect(updateCrud).toHaveBeenCalledWith('voicebot/campaigns', {
      id: row.id, updatedAt: row.updatedAt, name: row.name, agentId: 'agent-1', phoneNumberId: 'number-1', status: 'running',
    }, expect.anything()))
    expect(createCrud).not.toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveTextContent('Kampania została zapisana.')
  })

  it('zachowuje zapisane wybory przy pustym katalogu', async () => {
    jest.mocked(apiCall).mockImplementation(async <T,>(url: Parameters<typeof apiCall>[0]) => ({ ok: true, status: 200, result: String(url).includes('/provider') ? { configured: false, agents: [], numbers: [] } : { items: [row] } }) as ApiCallResult<T>)
    render(<CampaignsPage />)
    fireEvent.click(await screen.findByText('Edytuj'))
    expect(screen.getByLabelText('Agent')).toHaveValue('agent-2')
    expect(screen.getByLabelText('Numer wychodzący')).toHaveValue('number-2')
    fireEvent.click(screen.getByText('Anuluj'))
    expect(updateCrud).not.toHaveBeenCalled()
  })

  it('nie zamyka edycji po błędzie zapisu', async () => {
    jest.mocked(updateCrud).mockRejectedValue({ status: 409 })
    render(<CampaignsPage />)
    fireEvent.click(await screen.findByText('Edytuj'))
    fireEvent.change(screen.getByLabelText('Numer wychodzący'), { target: { value: 'number-1' } })
    fireEvent.click(screen.getByText('Zapisz'))
    await waitFor(() => expect(updateCrud).toHaveBeenCalled())
    expect(screen.getByLabelText('Numer wychodzący')).toHaveValue('number-1')
  })
})
