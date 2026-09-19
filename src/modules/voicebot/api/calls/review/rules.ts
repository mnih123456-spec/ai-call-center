type ReviewCall = {
  isTest?: boolean
  status: string
  consentGiven?: boolean | null
  identityConfirmed?: boolean | null
  productCode?: string | null
  crmError?: string | null
}

// Te same definicje budują filtr bazy i powody, aby paginacja nie gubiła spraw.
const rules = [
  { reason: 'consent_missing', where: { status: 'completed', $or: [{ consentGiven: false }, { consentGiven: null }] }, matches: (r: ReviewCall) => r.status === 'completed' && r.consentGiven !== true },
  { reason: 'identity_unconfirmed', where: { status: 'completed', identityConfirmed: false }, matches: (r: ReviewCall) => r.status === 'completed' && r.identityConfirmed === false },
  { reason: 'product_unknown', where: { status: 'completed', $or: [{ productCode: 'NIEUSTALONY' }, { productCode: '' }, { productCode: null }] }, matches: (r: ReviewCall) => r.status === 'completed' && (!r.productCode || r.productCode === 'NIEUSTALONY') },
  { reason: 'call_failed', where: { status: 'failed' }, matches: (r: ReviewCall) => r.status === 'failed' },
  { reason: 'no_answer', where: { status: 'no_answer' }, matches: (r: ReviewCall) => r.status === 'no_answer' },
  { reason: 'crm_error', where: { $and: [{ crmError: { $ne: null } }, { crmError: { $ne: '' } }] }, matches: (r: ReviewCall) => Boolean(r.crmError) },
] as const

export type ReviewReason = typeof rules[number]['reason']

export function reviewFilter() {
  return { isTest: false, $or: rules.map((rule) => rule.where) }
}

export function reviewReasons(call: ReviewCall): ReviewReason[] {
  if (call.isTest) return []
  return rules.filter((rule) => rule.matches(call)).map((rule) => rule.reason)
}
