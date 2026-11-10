import test from 'node:test'
import assert from 'node:assert/strict'
import {
  seedActivities,
  ordersFor,
  calculate,
  settle,
  payoutDate,
  extendActivity,
  validateActivity,
  activeProducts,
  checkProductCodes,
  checkExcludedProductCodes
} from '../src/services/activityPoints.ts'
const a = seedActivities[0]
await test('活动发放至少延迟15天，草稿与启用以及两类日历均遵守下限', () => {
  for (const draft of [true, false]) {
    for (const calendar of ['natural', 'weekday'] as const) {
      assert.equal(validateActivity({ ...a, draft, calendar, delay: 14 }), '活动结束后延迟天数不能小于15天')
      for (const delay of [15, 20, 90]) {
        assert.equal(validateActivity({ ...a, draft, calendar, delay }), '')
      }
    }
  }
})
await test('活动发放延迟仍拒绝空值、小数和超上限，不能绕过整数限制', () => {
  for (const delay of [0, -1, 14.9, 15.5, 91, NaN, Infinity, '' as unknown as number]) {
    assert.notEqual(validateActivity({ ...a, delay }), '', String(delay))
  }
})
await test('排除商品允许留空，参与商品编码仍为必填', () => {
  assert.deepEqual(checkExcludedProductCodes(''), { codes: [], duplicateCount: 0, error: '' })
  assert.notEqual(checkProductCodes('').error, '')
  assert.equal(validateActivity({ ...a, productMode: 'filter', excluded: [] }), '')
  assert.notEqual(validateActivity({ ...a, codes: [] }), '')
})
await test('排除编码同样校验完整输入、去重和1000项上限', () => {
  assert.deepEqual(checkExcludedProductCodes('DEMO-TP14,DEMO-CTO,DEMO-TP14'), {
    codes: ['DEMO-TP14', 'DEMO-CTO'], duplicateCount: 1, error: ''
  })
  for (const input of [' ', 'DEMO-TP14，DEMO-CTO', 'DEMO-TP14,', 'DEMO-TP14,,DEMO-CTO', 'DEMO-TP14, DEMO-CTO', 'DEMO-TP14,\nDEMO-CTO', 'DEMO-TP14,UNKNOWN']) {
    const result = checkExcludedProductCodes(input)
    assert.notEqual(result.error, '', input)
    assert.deepEqual(result.codes, [], input)
  }
  const atLimit = checkExcludedProductCodes(Array(1000).fill('DEMO-CTO').join(','))
  assert.equal(atLimit.error, '')
  assert.equal(atLimit.duplicateCount, 999)
  assert.match(checkExcludedProductCodes(Array(1001).fill('DEMO-CTO').join(',')).error, /1000/)
})
await test('排除有效编码只缩减FA产品组交集，范围外编码不扩大范围', () => {
  const filter = { ...a, productMode: 'filter' as const, fa: 'ThinkPad', group: '笔记本', excluded: ['DEMO-TC90'] }
  assert.equal(validateActivity(filter), '')
  assert.deepEqual(activeProducts(filter).map((product) => product.code), ['DEMO-TP14', 'DEMO-CTO'])
  assert.deepEqual(activeProducts({ ...filter, excluded: ['DEMO-TP14'] }).map((product) => product.code), ['DEMO-CTO'])
  assert.match(validateActivity({ ...filter, excluded: ['DEMO-TP14', 'DEMO-CTO'] }), /至少选择一个参与商品/)
  assert.match(validateActivity({ ...filter, group: '台式机', excluded: [] }), /至少选择一个参与商品/)
})
await test('绕过编辑器的无效排除编码也不可保存，编码模式不使用遗留排除', () => {
  for (const excluded of [['UNKNOWN'], ['DEMO-TP14', 'UNKNOWN'], [''], ['DEMO-TP14,DEMO-CTO'], [' DEMO-CTO'], Array(1001).fill('DEMO-CTO')]) {
    assert.notEqual(validateActivity({ ...a, productMode: 'filter', excluded }), '')
  }
  assert.equal(validateActivity({ ...a, productMode: 'codes', excluded: ['UNKNOWN'] }), '')
})
await test('商品编码按英文逗号输入，检测有效商品并去重', () => {
  assert.deepEqual(checkProductCodes('DEMO-TP14,DEMO-TC90,DEMO-TP14'), {
    codes: ['DEMO-TP14', 'DEMO-TC90'],
    duplicateCount: 1,
    error: ''
  })
})
await test('空输入、错误分隔符、空项和空白均阻止使用部分编码', () => {
  for (const input of [
    '',
    'DEMO-TP14，DEMO-TC90',
    'DEMO-TP14;DEMO-TC90',
    ',DEMO-TP14',
    'DEMO-TP14,',
    'DEMO-TP14,,DEMO-TC90',
    'DEMO-TP14, DEMO-TC90',
    'DEMO-TP14,\nDEMO-TC90',
    'DEMO-TP14\t'
  ]) {
    const result = checkProductCodes(input)
    assert.notEqual(result.error, '', input)
    assert.deepEqual(result.codes, [], input)
  }
})
await test('商品编码最多接受1000个输入项，去重不能绕过上限', () => {
  const atLimit = checkProductCodes(Array(1000).fill('DEMO-TP14').join(','))
  assert.equal(atLimit.error, '')
  assert.deepEqual(atLimit.codes, ['DEMO-TP14'])
  assert.equal(atLimit.duplicateCount, 999)
  const aboveLimit = checkProductCodes(Array(1001).fill('DEMO-TP14').join(','))
  assert.match(aboveLimit.error, /1000/)
  assert.deepEqual(aboveLimit.codes, [])
})
await test('未知演示编码阻止整组保存，修改输入后按新文本重新检测', () => {
  assert.equal(checkProductCodes('DEMO-TP14').error, '')
  const result = checkProductCodes('DEMO-TP14,REAL-UNKNOWN')
  assert.match(result.error, /当前演示商品库未找到.*REAL-UNKNOWN/)
  assert.deepEqual(result.codes, [])
  assert.match(
    validateActivity({ ...a, codes: ['DEMO-TP14', 'REAL-UNKNOWN'] }),
    /当前演示商品库未找到/
  )
  assert.equal(checkProductCodes('DEMO-TB16').error, '')
})
await test('按编码参与的商品忽略旧排除残留，筛选方式仍按交集减排除', () => {
  const old = { ...a, codes: ['DEMO-TP14'], excluded: ['DEMO-TP14'] }
  assert.deepEqual(
    activeProducts(old).map((product) => product.code),
    ['DEMO-TP14']
  )
  assert.equal(validateActivity(old), '')
  assert.equal(calculate(old, ordersFor(old))[0].eligible, true)
  assert.deepEqual(
    activeProducts({ ...old, productMode: 'filter', fa: 'ThinkPad', group: '笔记本' })
      .map((product) => product.code),
    ['DEMO-CTO']
  )
})
await test('企业跨账号合并，早期订单也达档，各账号金额单独核算', () => {
  const rows = calculate(a, ordersFor(a))
  const one = rows[0],
    two = rows[1]
  assert.equal(one.enterpriseQuantity, 10)
  assert.equal(two.enterpriseQuantity, 10)
  assert.equal(one.multiplier, 5)
  assert.equal(two.multiplier, 5)
  assert.equal(one.delta, 600)
  assert.equal(two.delta, 400)
  assert.notEqual(one.account, two.account)
  assert.equal(rows[6].multiplier, 0)
})
await test('按原始金额乘最终倍数取整，再扣实际已发，不提前取整', () => {
  const rows = calculate(a, ordersFor(a))
  assert.deepEqual([rows[2].target, rows[2].delta], [5932, 2966])
  assert.deepEqual([rows[3].target, rows[3].delta], [13611, 6806])
  assert.equal(rows[4].delta, 3575)
})
await test('满金额跨账号合并，精确金额边界', () => {
  const b = { ...a, mode: 'amount' as const, tiers: [{ threshold: 50000, multiplier: 5 }] }
  const orders = ordersFor(b).slice(0, 2)
  assert.equal(calculate(b, orders)[0].multiplier, 5)
  orders[1].refund = 0.01
  assert.equal(calculate(b, orders)[0].multiplier, 0)
})
await test('黑名单、范围外商品、退款不贡献累计也不发放；缺失已发、负差额暂缓', () => {
  const rows = calculate(a, ordersFor(a))
  assert.equal(rows[0].enterpriseQuantity, 10)
  for (const i of [7, 8, 11]) assert.equal(rows[i].eligible, false)
  assert.match(rows[9].issue, /缺少/)
  assert.match(rows[10].issue, /为负/)
  const paid = settle(a, rows, [], payoutDate(a))
  assert(!paid.some((r) => rows.slice(7).some((x) => x.id === r.orderId)))
})
await test('失败重试只处理未成功记录，重复运行无重复入账', () => {
  const rows = calculate(a, ordersFor(a))
  const first = settle(a, rows, [], payoutDate(a), rows[0].id)
  const second = settle(a, rows, first, payoutDate(a))
  assert.equal(second.length, first.length)
  assert.equal(second[0].attempts, 2)
  assert.match(second[0].history[0], /失败/)
  assert.match(second[0].history[1], /成功/)
  assert.equal(second[1].attempts, 1)
  assert.equal(second.filter((x) => x.status === '失败').length, 0)
  assert.deepEqual(settle(a, rows, second, payoutDate(a)), second)
  assert.throws(() => settle(a, rows, [], '2026-10-16'))
})
await test('延期顺延发放，旧计划失效，延长期内订单纳入', () => {
  const b = extendActivity(a, '2026-10-22', '采购延期')
  assert.equal(payoutDate(a), '2026-11-04')
  assert.equal(payoutDate(b), '2026-11-11')
  const orders = ordersFor(a).slice(0, 2)
  orders[1].date = '2026-10-20'
  assert.equal(calculate(a, orders)[0].multiplier, 0)
  assert.equal(calculate(b, orders)[0].multiplier, 5)
  assert.throws(() => settle(b, calculate(b, orders), [], payoutDate(a)))
  assert.throws(() => extendActivity(a, a.end, ''))
  assert.throws(() => extendActivity(a, '2026-10-22', '延期', '2026-10-16'))
  assert.match(b.logs[0], /2026-11-04 → 2026-11-11/)
})
await test('商品交集减排除，配置无效门槛拒绝保存', () => {
  assert.equal(
    activeProducts({ ...a, productMode: 'filter', fa: 'ThinkPad', group: '笔记本' }).length,
    1
  )
  assert.match(
    validateActivity({
      ...a,
      tiers: [
        { threshold: 10, multiplier: 5 },
        { threshold: 10, multiplier: 7 }
      ]
    }),
    /递增/
  )
  assert.match(
    validateActivity({ ...a, mode: 'quantity', tiers: [{ threshold: 1.5, multiplier: 5 }] }),
    /正整数/
  )
  assert.match(validateActivity({ ...a, codes: [] }), /商品/)
})

await test('原始表19笔匿名化样例逐笔相符，合计补发101411分', () => {
  const cases = [
    [9.0, 59328.0, 2966.0, 5932.0, 2966.0],
    [20.0, 131840.0, 6592.0, 13184.0, 6592.0],
    [30.0, 197760.0, 9888.0, 19776.0, 9888.0],
    [10.0, 65920.0, 3296.0, 6592.0, 3296.0],
    [18.0, 136116.0, 6805.0, 13611.0, 6806.0],
    [10.0, 75620.0, 3781.0, 7562.0, 3781.0],
    [20.0, 151240.0, 7562.0, 15124.0, 7562.0],
    [20.0, 151240.0, 7562.0, 15124.0, 7562.0],
    [5.0, 38310.0, 1915.0, 3831.0, 1916.0],
    [7.0, 53634.0, 2681.0, 5363.0, 2682.0],
    [10.0, 64990.0, 2924.0, 6499.0, 3575.0],
    [10.0, 64990.0, 3249.0, 6499.0, 3250.0],
    [10.0, 64990.0, 3249.0, 6499.0, 3250.0],
    [67.0, 435433.0, 21771.0, 43543.0, 21772.0],
    [15.0, 114930.0, 5746.0, 11493.0, 5747.0],
    [5.0, 38310.0, 1915.0, 3831.0, 1916.0],
    [10.0, 76620.0, 3831.0, 7662.0, 3831.0],
    [5.0, 33460.0, 1673.0, 3346.0, 1673.0],
    [10.0, 66920.0, 3346.0, 6692.0, 3346.0]
  ]
  const template = ordersFor(a)[0]
  const orders = cases.map(([quantity, receipt, paid], i) => ({
    ...template,
    id: `SAMPLE-${i + 1}`,
    account: 'LID-SAMPLE',
    quantity,
    receipt,
    paidBase: Math.floor(receipt / 100),
    paidMember: paid - Math.floor(receipt / 100)
  }))
  const rows = calculate(a, orders)
  rows.forEach((r, i) => {
    assert.equal(r.target, cases[i][3])
    assert.equal(r.delta, cases[i][4])
  })
  assert.equal(
    rows.reduce((n, r) => n + r.netQuantity, 0),
    291
  )
  assert.equal(
    rows.reduce((n, r) => n + r.netReceipt, 0),
    2021651
  )
  assert.equal(
    rows.reduce((n, r) => n + r.target, 0),
    202163
  )
  assert.equal(
    rows.reduce((n, r) => n + r.paid, 0),
    100752
  )
  assert.equal(
    rows.reduce((n, r) => n + r.delta, 0),
    101411
  )
})
