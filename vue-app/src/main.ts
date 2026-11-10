import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { isPocSandbox, isPocWorkbench, normalAppBase } from './config/runtimeMode'
import { createPocWorkbenchFetch, isPocWorkbenchApiLink } from './services/pocWorkbenchNetwork'
import { showWorkbenchToast } from './services/toast'

// 当前 Vue 版继续复用封板工作台样式合同，只迁工程边界，不重画 UI。
import './assets/workbench.css'
import './assets/workbench-original-lock.css'
import './assets/workbench-prd-modules.css'
import './assets/workbench-ui-polish.css'
import './assets/workbench-preview-overrides.css'
import './assets/vue-shell-adapter.css'

// Built demo documents cannot contact APIs even if a future consumer adds a request.
// Dev keeps Vite's HMR connection; browser regression also asserts zero demo API calls.
if (isPocWorkbench) {
  window.fetch = createPocWorkbenchFetch(window.fetch.bind(window), window.location.origin, normalAppBase)
  const originalAnchorClick = HTMLAnchorElement.prototype.click
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    if (isPocWorkbenchApiLink(this.href, window.location.origin)) {
      showWorkbenchToast('当前工作台使用本地演示数据，未连接此下载服务。')
      return
    }
    originalAnchorClick.call(this)
  }
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    if (link instanceof HTMLAnchorElement && isPocWorkbenchApiLink(link.href, window.location.origin)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      showWorkbenchToast('当前工作台使用本地演示数据，未连接此下载服务。')
    }
  }, true)
}
if (isPocSandbox && import.meta.env.PROD) {
  const policy = document.createElement('meta')
  policy.httpEquiv = 'Content-Security-Policy'
  const assets = window.location.origin + normalAppBase
  policy.content = isPocWorkbench
    ? `connect-src ${assets}assets/ ${assets}admin-runtime/ ${assets}poc-release-ledger.json; form-action 'none'`
    : "connect-src 'none'; form-action 'none'"
  document.head.append(policy)
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
