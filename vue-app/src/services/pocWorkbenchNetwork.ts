/** The complete browser workbench may load its existing assets, never a business backend. */
export function createPocWorkbenchFetch(original: typeof fetch, origin: string, base: string): typeof fetch {
  return async (input, init) => {
    const request = typeof Request !== 'undefined' && input instanceof Request ? input : null
    const url = new URL(request ? request.url : String(input), origin)
    const method = (init?.method || request?.method || 'GET').toUpperCase()
    const staticPath = url.pathname.startsWith(base + 'admin-runtime/')
      || url.pathname.startsWith(base + 'assets/')
      || url.pathname === base + 'poc-release-ledger.json'
    if (url.origin !== origin || !staticPath || url.pathname.includes('%') || !['GET', 'HEAD'].includes(method)) {
      return new Response(JSON.stringify({ code: 'POC_WORKBENCH_LOCAL_ONLY', error: '当前工作台使用本地演示数据，未连接此业务服务。' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      })
    }
    const headers = new Headers(init?.headers || request?.headers)
    headers.delete('authorization')
    return original(input, { ...init, headers, credentials: 'omit', redirect: 'error' })
  }
}

export function isPocWorkbenchApiLink(href: string, origin: string): boolean {
  const url = new URL(href, origin)
  return url.origin === origin && (url.pathname === '/api' || url.pathname.startsWith('/api/'))
}
