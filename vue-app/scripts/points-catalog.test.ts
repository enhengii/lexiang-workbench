import test from 'node:test'
import assert from 'node:assert/strict'

const load = () => import('../src/services/pointsCatalog.ts')
const currency = () => ({
  name: '演示积分',
  description: '',
  expiryRule: 'year',
  validity: '0',
  rate: '100',
  status: 'enabled'
})
const channel = () => ({
  name: '演示渠道',
  description: '',
  currencyId: 'DEMO-POINTS',
  dailyLimit: '0',
  totalLimit: '0',
  status: 'enabled'
})

await test('currency normalization keeps zero validity and the amount per one point', async () => {
  const { validateCurrencyInput } = await load()
  const result = validateCurrencyInput({ ...currency(), name: '  演示积分  ' })
  assert.equal(result.valid, true)
  if (result.valid)
    assert.deepEqual(result.value, { ...currency(), name: '演示积分', validity: 0, rate: 100 })
})

await test('never-expiring currency removes a previously entered validity', async () => {
  const { validateCurrencyInput } = await load()
  const result = validateCurrencyInput({ ...currency(), expiryRule: 'never', validity: '7' })
  assert.equal(result.valid, true)
  if (result.valid) assert.equal(result.value.validity, null)
})
await test('expiry rules require a string enum and reject arrays or string wrappers', async () => {
  const { validateCurrencyInput } = await load()
  for (const expiryRule of [['year'], ['month'], new String('year'), null, 1]) {
    const result = validateCurrencyInput({ ...currency(), expiryRule })
    assert.equal(result.valid, false)
    if (!result.valid) assert.ok(result.fieldErrors.expiryRule)
  }
})

await test('persisted expiry rule arrays cannot be restored as a currency', async () => {
  const { freshPointsCatalog, parsePointsCatalogSnapshot } = await load()
  const data = freshPointsCatalog()
  const snapshot = { ...data, currencies: [{ ...data.currencies[0], expiryRule: ['year'], validity: 0 }] }
  assert.throws(() => parsePointsCatalogSnapshot(JSON.stringify(snapshot)))
})


await test('currency rejects blank names, missing or fractional validity and nonpositive rates', async () => {
  const { validateCurrencyInput } = await load()
  for (const value of ['', ' ', '-1', '1.5', 'Infinity', 'NaN']) {
    const result = validateCurrencyInput({ ...currency(), validity: value })
    assert.equal(result.valid, false, `validity ${value}`)
    if (!result.valid) assert.ok(result.fieldErrors.validity)
  }
  for (const value of ['', ' ', '0', '-1', 'Infinity', 'NaN']) {
    const result = validateCurrencyInput({ ...currency(), rate: value })
    assert.equal(result.valid, false, `rate ${value}`)
    if (!result.valid) assert.ok(result.fieldErrors.rate)
  }
  assert.equal(validateCurrencyInput({ ...currency(), name: '  ' }).valid, false)
  assert.equal(validateCurrencyInput({ ...currency(), expiryRule: 'other' }).valid, false)
  assert.equal(validateCurrencyInput({ ...currency(), status: 'other' }).valid, false)
  assert.equal(validateCurrencyInput(null).valid, false)
})

await test('channel accepts unlimited zero limits and requires an existing currency', async () => {
  const { validateChannelInput, freshPointsCatalog } = await load()
  const result = validateChannelInput(channel(), freshPointsCatalog().currencies)
  assert.equal(result.valid, true)
  if (result.valid) assert.deepEqual(result.value, { ...channel(), dailyLimit: 0, totalLimit: 0 })
  const missing = validateChannelInput(
    { ...channel(), currencyId: 'missing' },
    freshPointsCatalog().currencies
  )
  assert.equal(missing.valid, false)
  if (!missing.valid) assert.ok(missing.fieldErrors.currencyId)
})

await test('channel rejects blank names and missing, negative or fractional limits', async () => {
  const { validateChannelInput, freshPointsCatalog } = await load()
  const currencies = freshPointsCatalog().currencies
  for (const field of ['dailyLimit', 'totalLimit']) {
    for (const value of ['', ' ', '-1', '2.5', 'NaN', 'Infinity']) {
      const result = validateChannelInput({ ...channel(), [field]: value }, currencies)
      assert.equal(result.valid, false, `${field} ${value}`)
      if (!result.valid) assert.ok(result.fieldErrors[field])
    }
  }
  assert.equal(validateChannelInput({ ...channel(), name: ' ' }, currencies).valid, false)
})

await test('persisted catalog validates all records, references and synthetic identities', async () => {
  const { freshPointsCatalog, parsePointsCatalogSnapshot } = await load()
  const state = freshPointsCatalog()
  assert.deepEqual(parsePointsCatalogSnapshot(JSON.stringify(state)), state)
  const corrupt = [
    { ...state, version: 2 },
    { ...state, currencies: [{ ...state.currencies[0], rate: 0 }] },
    { ...state, currencies: [{ ...state.currencies[0], rate: '100' }] },
    { ...state, currencies: [state.currencies[0], state.currencies[0]] },
    { ...state, channels: [{ ...state.channels[0], currencyId: 'missing' }] },
    { ...state, channels: [{ ...state.channels[0], token: 'not-a-demo-token' }] },
    { ...state, channels: [{ ...state.channels[0], dailyLimit: -1 }] },
    { ...state, channels: [{ ...state.channels[0], operator: 1 }] }
  ]
  for (const value of corrupt)
    assert.throws(() => parsePointsCatalogSnapshot(JSON.stringify(value)))
  assert.throws(() => parsePointsCatalogSnapshot('{broken'))
})

await test('seed records are independent synthetic examples with no precomputed issue total', async () => {
  const { freshPointsCatalog, maskDemoToken } = await load()
  const first = freshPointsCatalog()
  const second = freshPointsCatalog()
  assert.equal(first.currencies[0].id, 'DEMO-POINTS')
  assert.equal(first.currencies[0].rate, 100)
  assert.equal(first.currencies[0].expiryRule, 'never')
  assert.equal(first.channels[0].currencyId, 'DEMO-POINTS')
  assert.match(first.channels[0].token, /^DEMO-/)
  assert.notEqual(maskDemoToken(first.channels[0].token), first.channels[0].token)
  assert.match(maskDemoToken(first.channels[0].token), /^DEMO-/)
  first.currencies[0].name = 'changed'
  assert.equal(second.currencies[0].name, '企业积分')
  assert.equal('issued' in second.currencies[0], false)
})
