import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia } from 'pinia'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const saved = new Map()
globalThis.localStorage = {
  getItem: (key) => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value)
}
const server = await createServer({
  root,
  configFile: false,
  logLevel: 'error',
  resolve: { alias: { '@': resolve(root, 'src') } },
  plugins: [
    {
      name: 'catalog-view-state',
      enforce: 'pre',
      async load(id) {
        if (!id.endsWith('/PointsCatalogView.vue')) return
        return (await readFile(id, 'utf8')).replace(
          '</script>',
          'globalThis.__catalogViewState?.({ draft, applied, page, rows, paged, editor, form, errors, notice, openEditor, closeEditor, save, query, reset, issuedTotal });\n</script>'
        )
      }
    },
    vue()
  ],
  server: { middlewareMode: true, watch: null, hmr: false }
})
try {
  const { useAppStore } = await server.ssrLoadModule('/src/stores/app.ts')
  const { freshPointsCatalog, PointsCatalogValidationError } = await server.ssrLoadModule(
    '/src/services/pointsCatalog.ts'
  )
  const { usePointsCatalogDemo } = await server.ssrLoadModule(
    '/src/views/points/usePointsCatalogDemo.ts'
  )
  const demo = usePointsCatalogDemo()
  await test('catalog pages render original columns, masked synthetic tokens and live successful total', async () => {
    const { html, bindings } = await render('currency')
    assert.match(html, /虚拟币ID/)
    assert.match(html, /过期规则/)
    assert.match(html, /100 元可获得 1 积分/)
    assert.match(html, /22,541/)
    assert.match(html, /不过期为演示假设/)
    assert.equal(bindings.issuedTotal.value, 22541)
    const channel = await render('channel')
    assert.match(channel.html, /用户日发放限制/)
    assert.match(channel.html, /渠道总发放限制/)
    assert.match(channel.html, /DEMO-••••-OKEN/)
    assert.doesNotMatch(channel.html, /DEMO-CHANNEL-ENTERPRISE-TOKEN/)
    assert.doesNotMatch(channel.html, />删除</)
  })
  await test('save actions validate input and keep IDs and channel token stable', async () => {
    Object.assign(demo.state, freshPointsCatalog())
    const before = demo.state.channels[0]
    const changed = demo.saveChannel(
      { ...before, name: '修改演示渠道', token: 'DEMO-REPLACED' },
      before.id
    )
    assert.equal(changed.id, before.id)
    assert.equal(changed.token, before.token)
    assert.equal(changed.name, '修改演示渠道')
    assert.throws(
      () => demo.saveChannel({ ...changed, dailyLimit: '' }, changed.id),
      PointsCatalogValidationError
    )
    assert.throws(
      () => demo.saveCurrency({ ...demo.state.currencies[0], rate: 0 }),
      PointsCatalogValidationError
    )
    assert.throws(
      () => demo.saveCurrency(demo.state.currencies[0], 'DEMO-MISSING'),
      PointsCatalogValidationError
    )
    const created = demo.saveCurrency({
      name: '新演示积分',
      description: '',
      expiryRule: 'month',
      validity: 0,
      rate: 2,
      status: 'enabled'
    })
    assert.match(created.id, /^DEMO-/)
    await nextTick()
    assert.match(saved.get('portal.points-catalog.demo.v1'), /新演示积分/)
  })
  await test('query, reset and pagination apply the selected name and status', async () => {
    Object.assign(demo.state, freshPointsCatalog())
    for (let i = 0; i < 12; i++)
      demo.saveCurrency({
        name: `演示积分 ${i}`,
        description: '',
        expiryRule: 'never',
        validity: null,
        rate: 1,
        status: i % 2 ? 'enabled' : 'disabled'
      })
    const result = await render('currency', (b) => {
      b.page.value = 2
      b.draft.name = '演示积分'
      b.draft.status = 'disabled'
      b.query()
    })
    assert.equal(result.bindings.page.value, 1)
    assert.equal(result.bindings.rows.value.length, 6)
    result.bindings.reset()
    assert.equal(result.bindings.rows.value.length, 13)
    result.bindings.page.value = 2
    assert.equal(result.bindings.paged.value.length, 3)
  })
  await test('cancel leaves records untouched; successful saves show inline errors then persist', async () => {
    Object.assign(demo.state, freshPointsCatalog())
    const result = await render('channel', (b) => b.openEditor())
    result.bindings.form.name = '未保存渠道'
    result.bindings.closeEditor()
    assert.equal(demo.state.channels.length, 1)
    result.bindings.openEditor()
    result.bindings.save()
    assert.ok(result.bindings.errors.value.name)
    result.bindings.form.name = '新演示渠道'
    result.bindings.form.dailyLimit = '0'
    result.bindings.form.totalLimit = '0'
    result.bindings.save()
    assert.equal(demo.state.channels.length, 2)
    assert.equal(result.bindings.editor.value, null)
    assert.equal(result.bindings.rows.value[0].issued, 0)
  })
  await test('a read-only viewer cannot open or invoke configuration actions', async () => {
    Object.assign(demo.state, freshPointsCatalog())
    const result = await render('currency', (b) => b.openEditor(), {
      role: '普通用户',
      permissions: ['points.activity.view']
    })
    assert.equal(result.bindings.editor.value, null)
    assert.doesNotMatch(result.html, /<dialog\b/)
    assert.match(result.html, /disabled[^>]*>\s*添加/)
    const length = demo.state.currencies.length
    result.bindings.form.name = '越权配置'
    result.bindings.save()
    assert.equal(demo.state.currencies.length, length)
  })
  await test('no-permission view exposes neither catalog rows nor configuration dialog', async () => {
    const result = await render('channel', (b) => b.openEditor(), {
      user: null,
      role: null,
      permissions: []
    })
    assert.match(result.html, /暂无积分查看权限/)
    assert.doesNotMatch(result.html, /DEMO-POINTS|DEMO-••••|<dialog\b/)
  })
  await test('catalog configuration changes do not change successful historical activity awards', async () => {
    Object.assign(demo.state, freshPointsCatalog())
    const { useActivityPointsDemo } = await server.ssrLoadModule(
      '/src/views/points/useActivityPointsDemo.ts'
    )
    const activity = useActivityPointsDemo()
    const before = JSON.stringify(activity.state.records)
    const result = await render('currency')
    demo.saveCurrency(
      { ...demo.state.currencies[0], rate: 999, expiryRule: 'year', validity: 1 },
      'DEMO-POINTS'
    )
    demo.saveChannel(
      { ...demo.state.channels[0], totalLimit: 1, status: 'disabled' },
      'DEMO-CHANNEL-ENTERPRISE'
    )
    assert.equal(JSON.stringify(activity.state.records), before)
    assert.equal(result.bindings.issuedTotal.value, 22541)
    const other = demo.saveCurrency({
      name: '独立演示币', description: '', expiryRule: 'never', validity: null, rate: 1, status: 'enabled'
    })
    demo.saveChannel({ ...demo.state.channels[0], currencyId: other.id }, 'DEMO-CHANNEL-ENTERPRISE')
    const channel = await render('channel')
    assert.equal(channel.bindings.rows.value[0].issued, 22541, 'historical awards follow stable channel identity')
    const otherCurrency = await render('currency')
    assert.equal(otherCurrency.bindings.rows.value.find((row) => row.id === other.id).issued, 0)
  })
  await test('successful activity settlement updates both catalog totals reactively', async () => {
    Object.assign(demo.state, freshPointsCatalog())
    const { useActivityPointsDemo } = await server.ssrLoadModule('/src/views/points/useActivityPointsDemo.ts')
    const { calculate, ordersFor, payoutDate, settle } = await server.ssrLoadModule('/src/services/activityPoints.ts')
    const { buildActivityPointsLedger } = await server.ssrLoadModule('/src/services/activityPointsLedger.ts')
    const activity = useActivityPointsDemo()
    activity.reset()
    const currency = await render('currency')
    const channel = await render('channel')
    const selected = activity.state.activities[0]
    const date = payoutDate(selected)
    activity.state.records = settle(selected, calculate(selected, ordersFor(selected), date), activity.state.records, date)
    activity.state.date = date
    const expected = buildActivityPointsLedger(activity.state.activities, activity.state.records, date)
      .reduce((sum, row) => sum + row.points, 0)
    assert.ok(expected > 22541)
    assert.equal(currency.bindings.rows.value[0].issued, expected)
    assert.equal(channel.bindings.rows.value[0].issued, expected)
    activity.reset()
  })
  await test('save feedback distinguishes in-page edits from browser persistence and recovers after a retry', async () => {
    const originalWrite = localStorage.setItem
    for (const mode of ['currency', 'channel']) {
      Object.assign(demo.state, freshPointsCatalog())
      demo.storageNotice.value = ''
      localStorage.setItem = () => { throw new Error('blocked') }
      try {
        const failed = await render(mode, (b) => {
          b.openEditor()
          b.form.name = '未持久化演示'
          b.form.rate = 100
          b.form.dailyLimit = 0
          b.form.totalLimit = 0
          b.save()
          assert.match(b.notice.value, /仅在当前页面生效/)
          assert.match(demo.storageNotice.value, /未能保存/)
        })
        assert.match(failed.html, /刷新后可能丢失/)
        assert.doesNotMatch(failed.html, /已保存至当前浏览器/)
      } finally { localStorage.setItem = originalWrite }
      const success = await render(mode, (b) => {
        b.openEditor()
        b.form.name = '持久化恢复演示'
        b.form.rate = 100
        b.form.dailyLimit = 0
        b.form.totalLimit = 0
        b.save()
        assert.match(b.notice.value, /已保存至当前浏览器/)
      })
      assert.equal(demo.storageNotice.value, '')
      assert.match(success.html, /已保存至当前浏览器/)
      assert.match(saved.get('portal.points-catalog.demo.v1'), /持久化恢复演示/)
    }
  })
  await test('storage write errors keep current edits available and expose a notice', async () => {
    const old = localStorage.setItem
    localStorage.setItem = () => {
      throw new Error('blocked')
    }
    try {
      const created = demo.saveCurrency({
        name: '仅本次演示',
        description: '',
        expiryRule: 'never',
        validity: null,
        rate: 1,
        status: 'enabled'
      })
      await nextTick()
      assert.ok(demo.state.currencies.some((row) => row.id === created.id))
      assert.match(demo.storageNotice.value, /未能保存/)
    } finally {
      localStorage.setItem = old
    }
  })
  async function render(mode, select = () => {}, options = {}) {
    let bindings
    globalThis.__catalogViewState = (value) => {
      bindings = value
      select(value)
    }
    const Component = (await server.ssrLoadModule('/src/views/points/PointsCatalogView.vue'))
      .default
    const app = createSSRApp(Component, { mode })
    const pinia = createPinia()
    app.use(pinia)
    const store = useAppStore(pinia)
    store.user = options.user === undefined ? 'catalog-test' : options.user
    store.role = options.role === undefined ? '平台管理员' : options.role
    store.permissions = options.permissions || []
    return { html: await renderToString(app), bindings }
  }
} finally {
  delete globalThis.__catalogViewState
  await server.close()
}
