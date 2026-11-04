import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const saved = new Map()
globalThis.localStorage = {
  getItem: (key) => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value)
}
const server = await createServer({
  root, configFile: false, logLevel: 'error',
  resolve: { alias: { '@': resolve(root, 'src') } },
  plugins: [{
    name: 'legacy-rule-view-state', enforce: 'pre',
    async load(id) {
      if (!id.endsWith('/PointsLegacyRulesView.vue')) return
      return (await readFile(id, 'utf8')).replace('</script>',
        'globalThis.__legacyRuleViewState?.({ filter, applied, page, rows, filtered, columns, editor, codeInput, formError, editingId, discardConfirm, historyId, snapshotId, notice, openEditor, closeEditor, save, query, clearFilters, requestEnd, confirmEnd, viewSnapshot, setProductMode, setCapMode });\n</script>')
    }
  }, vue()],
  server: { middlewareMode: true, watch: null }
})
try {
  const { useAppStore } = await server.ssrLoadModule('/src/stores/app.ts')
  const { createLegacyRulesState } = await server.ssrLoadModule('/src/services/pointsLegacyRules.ts')
  const { usePointsLegacyRulesDemo } = await server.ssrLoadModule('/src/views/points/usePointsLegacyRulesDemo.ts')
  const demo = usePointsLegacyRulesDemo()

  await test('抵现页保留筛选、原列表操作和独立历史快照', async () => {
    Object.assign(demo.state, createLegacyRulesState())
    const result = await render('deduction')
    assert.match(result.html, /积分抵现规则/)
    assert.match(result.html, /本地演示/)
    assert.match(result.html, /规则名/)
    assert.match(result.html, /演示积分抵现规则/)
    assert.equal(result.bindings.rows.value.length, 2)
    const history = await render('deduction', (b) => { b.historyId.value = demo.state.rules[0].id })
    assert.match(history.html, /操作记录/)
    assert.match(history.html, /查看快照/)
    const snapshot = await render('deduction', (b) => b.viewSnapshot(demo.state.rules[0].history[0].snapshot))
    assert.match(snapshot.html, /历史快照，只读/)
    assert.doesNotMatch(snapshot.html, /form="legacy-rule-form"/)
  })
  await test('获取规则只迁入已核对列表和空态，不创建演示规则或开放抵现表单', async () => {
    const result = await render('earning', (b) => b.openEditor())
    assert.equal(result.bindings.rows.value.length, 0)
    assert.equal(result.bindings.editor.value, null)
    assert.deepEqual(result.bindings.columns.value.map((c) => c.label), ['规则类型', '规则编号', '活动名称', '有效时间', '规则状态', '操作'])
    assert.match(result.html, /原页面新增表单暂不可用，尚未迁入/)
    assert.match(result.html, /暂无积分获取规则/)
    assert.match(result.html, /<thead\b[^>]*>[\s\S]*规则类型[\s\S]*规则编号[\s\S]*活动名称[\s\S]*有效时间[\s\S]*规则状态[\s\S]*操作[\s\S]*<\/thead>/)
    assert.match(result.html, /disabled[^>]*>添加/)
    assert.doesNotMatch(result.html, /筛选虚拟币|积分抵扣条件|演示积分抵现规则/)
  })
  await test('查询条件组合过滤，查询与重置回到第一页', async () => {
    const result = await render('deduction', (b) => {
      b.page.value = 2
      b.filter.value.name = '历史'
      b.filter.value.status = '停用'
      b.query()
    })
    assert.equal(result.bindings.page.value, 1)
    assert.equal(result.bindings.filtered.value.length, 1)
    assert.equal(result.bindings.rows.value[0].id, 'DEMO-RULE-D-000')
    result.bindings.clearFilters()
    assert.equal(result.bindings.filtered.value.length, 2)
  })
  await test('取消不保存，切换商品与金额模式清除隐藏字段，保存不改活动发放记录', async () => {
    Object.assign(demo.state, createLegacyRulesState())
    const result = await render('deduction', (b) => b.openEditor())
    result.bindings.editor.value.name = '未保存演示规则'
    result.bindings.closeEditor()
    assert.equal(result.bindings.discardConfirm.value, true)
    assert.equal(demo.state.rules.length, 2)
    result.bindings.closeEditor(true)
    result.bindings.openEditor()
    result.bindings.editor.value.name = '演示新增规则'
    result.bindings.editor.value.userGroups = ['DEMO-GROUP-A']
    result.bindings.codeInput.value = 'DEMO-TP14'
    result.bindings.setProductMode('filter')
    assert.equal(result.bindings.codeInput.value, '')
    assert.deepEqual(result.bindings.editor.value.codes, [])
    result.bindings.editor.value.fa = 'ThinkPad'
    result.bindings.editor.value.group = '笔记本'
    result.bindings.setCapMode('unlimited')
    assert.equal(result.bindings.editor.value.capPercent, null)
    const activity = (await server.ssrLoadModule('/src/views/points/useActivityPointsDemo.ts')).useActivityPointsDemo()
    const awards = JSON.stringify(activity.state.records)
    result.bindings.save()
    assert.equal(result.bindings.formError.value, '')
    assert.equal(result.bindings.editor.value, null)
    assert.equal(demo.state.rules.length, 3)
    assert.equal(JSON.stringify(activity.state.records), awards)
  })
  await test('查看权限不能调用配置；未授权视图不透露规则与弹窗', async () => {
    const result = await render('deduction', (b) => b.openEditor(), { user: 'viewer', role: '普通用户', permissions: ['points.activity.view'] })
    assert.equal(result.bindings.editor.value, null)
    assert.doesNotMatch(result.html, />修改<|>提前结束<|<dialog\b/)
    const denied = await render('deduction', (b) => b.openEditor(), { user: null, role: null, permissions: [] })
    assert.match(denied.html, /暂无积分规则查看权限/)
    assert.doesNotMatch(denied.html, /DEMO-RULE|演示积分抵现规则|<dialog\b/)
  })
  await test('保存失败只报告本次页面生效，恢复后实际写入浏览器并清除旧警告', async () => {
    Object.assign(demo.state, createLegacyRulesState())
    saved.delete('portal.points-legacy-rules.demo.v1')
    const result = await render('deduction', (b) => b.openEditor())
    result.bindings.editor.value.name = '演示存储失败规则'
    result.bindings.editor.value.userGroups = ['DEMO-GROUP-A']
    result.bindings.codeInput.value = 'DEMO-TP14'
    const write = localStorage.setItem
    localStorage.setItem = () => { throw new Error('storage blocked') }
    try {
      result.bindings.save()
      assert.equal(result.bindings.formError.value, '')
      assert.ok(demo.state.rules.some((rule) => rule.name === '演示存储失败规则'))
      assert.equal(saved.has('portal.points-legacy-rules.demo.v1'), false)
      assert.match(result.bindings.notice.value, /本次页面.*生效.*刷新.*丢失/)
      assert.doesNotMatch(result.bindings.notice.value, /已保存|保存在当前浏览器/)
      assert.match(demo.storageNoticeRef.value, /未能保存.*刷新.*丢失/)
    } finally { localStorage.setItem = write }
    result.bindings.openEditor(demo.state.rules[0])
    result.bindings.editor.value.name = '演示恢复保存规则'
    result.bindings.save()
    const stored = JSON.parse(saved.get('portal.points-legacy-rules.demo.v1'))
    assert.equal(stored.rules[0].name, '演示恢复保存规则')
    assert.match(result.bindings.notice.value, /已保存到当前浏览器/)
    assert.equal(demo.storageNoticeRef.value, '')
  })
  await test('提前结束同样区分本次页面状态和浏览器保存结果', async () => {
    Object.assign(demo.state, createLegacyRulesState())
    saved.delete('portal.points-legacy-rules.demo.v1')
    const result = await render('deduction', (b) => b.requestEnd(demo.state.rules[0]))
    const write = localStorage.setItem
    localStorage.setItem = () => { throw new Error('storage blocked') }
    try {
      result.bindings.confirmEnd()
      assert.equal(demo.state.rules[0].status, '提前结束')
      assert.equal(saved.has('portal.points-legacy-rules.demo.v1'), false)
      assert.match(result.bindings.notice.value, /本次页面.*生效.*刷新.*丢失/)
      assert.doesNotMatch(result.bindings.notice.value, /已保存|保存在当前浏览器/)
    } finally { localStorage.setItem = write }
    Object.assign(demo.state, createLegacyRulesState())
    result.bindings.requestEnd(demo.state.rules[0])
    result.bindings.confirmEnd()
    const stored = JSON.parse(saved.get('portal.points-legacy-rules.demo.v1'))
    assert.equal(stored.rules[0].status, '提前结束')
    assert.equal(stored.rules[0].history.at(-1).action, '提前结束')
    assert.match(result.bindings.notice.value, /已保存到当前浏览器/)
    assert.equal(demo.storageNoticeRef.value, '')
  })
  async function render(mode, select = () => {}, options = {}) {
    let bindings
    globalThis.__legacyRuleViewState = (value) => { bindings = value; select(value) }
    const Component = (await server.ssrLoadModule('/src/views/points/PointsLegacyRulesView.vue')).default
    const app = createSSRApp(Component, { mode })
    const pinia = createPinia()
    app.use(pinia)
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: {} }, { path: '/points/activity', component: {} }] })
    app.use(router)
    await router.push('/')
    const store = useAppStore(pinia)
    store.user = options.user === undefined ? 'rules-test' : options.user
    store.role = options.role === undefined ? '平台管理员' : options.role
    store.permissions = options.permissions || []
    return { html: await renderToString(app), bindings }
  }
} finally {
  delete globalThis.__legacyRuleViewState
  await server.close()
}
