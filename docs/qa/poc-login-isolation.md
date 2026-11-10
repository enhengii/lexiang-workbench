# 正常登录与 POC 演示隔离

日期：2026-10-23。范围：仅本地实现和验证，不部署线上，不修改后台认证和真实数据。

## 行为合同

| 入口 | 登录及数据行为 |
| --- | --- |
| 管理员免密登录 | 进入 `/admin-vue/poc/workbench/portal/home`，复用完整原工作台、全部菜单和 AI 助手，不显示独立审批演示导航；不创建真实后台会话 |
| 外部正常登录 | 普通 `/admin-vue/login?loginType=external` 保留原用户名密码接口及权限范围 |
| 内部首次登录 | `/admin-vue/poc/adfs-login` → 独立首次权限申请页，模拟申请及审批记录 |
| 内部账号禁用 | 同一演示范围内申请启用 → 系统管理员审批 → 再次登录，演示状态不改变真实账号 |
| 外部账号禁用 | 提示联系联想业务接口人，不提供自助启用入口 |
| 无账号邮件审批 | 演示审批工作台 → 审批邮件演示 → 无账号审批，保留既有独立页和校验逻辑 |

演示顶部提供“选择演示场景”“演示审批工作台”“返回正常登录”。同一域名下使用独立路径，不要求新增域名或后台实例。演示申请仅存在当前浏览器，不能作为真实邮件审批、跨设备共享或生产审批授权。

## 环境边界

- 开发环境默认开启演示；生产构建默认关闭。后续获准上线时显式设置 `VITE_AUTH_MODE=server` 与 `VITE_POC_LOGIN_ENABLED=true`。这是构建时配置，仅修改已部署服务环境变量不会改变旧静态包。
- 正常登录继续连接所在站点配置的原后台；不修改服务器、代理、数据库或账号。管理员实际业务范围仍由该后台的账号、角色及原菜单接口决定。
- `/admin-vue/poc/workbench/` 复用原 AppLayout 和全部业务页面，专用浏览器会话标记只恢复此范围的管理员界面；普通路由不接受该标记。其他 `/poc/` 首次访问、禁用和审批场景保持原独立布局。均不生成真实后台登录身份；完整工作台只允许无凭据读取本站静态资源，真实业务接口及表单提交受限，原独立审批范围保持 `connect-src 'none'; form-action 'none'`。
- 原审批模拟 LocalStorage、SessionStorage 保留 `leaibot-poc-demo:` 前缀；管理员会话使用固定 raw 前缀键，保证从正常登录文档进入完整工作台时读到同一标记。完整工作台继续复用现有 Skill、场景包、积分等本地业务记录，不声称全部原始工作台存储重新隔离；真实 Cookie 不改。旧的无前缀审批演示记录不自动迁移。
- 不再接受普通路由上的 `preview_user` 作为认证依据，也不在真实登录失败时自动创建模拟工作台身份。
- 内部演示不读取或填入管理员密码；保留的 loopback 插件不再连接内部演示选择器。真实密码登录仅保留在外部登录面板。
- 前端隔离不替代后台安全控制；此次不修改原菜单接口的权限回退规则、真实账号启用或真实审批接口。

## 复验

在 `vue-app` 目录使用项目 Node（原生 TypeScript 单测需要 Node 24）：

```sh
node --test scripts/poc-isolation.test.mjs scripts/local-poc-admin-plugin.test.mjs scripts/approval-mail-review.test.mjs scripts/poc-enable-state-regression.test.mjs scripts/first-access-business-approver.test.mjs scripts/product-contract-regression.test.mjs
node scripts/verify-poc-isolation-browser.mjs
POC_QA_DISABLED=true node scripts/verify-poc-isolation-browser.mjs
POC_QA_OUT_DIR=<独立生产构建目录> node scripts/verify-poc-isolation-browser.mjs
PERMISSION_QA_BASE_URL=http://127.0.0.1:5176/admin-vue/poc node scripts/verify-approval-mail-review-browser.mjs
```

浏览器测试自建隔离服务/浏览器，管理员接口由测试拦截返回，使用虚构测试密码和 Cookie，不对真实账号登录、申请或审批。覆盖失败路径、启用后再次登录、存储和会话隔离、关闭开关、遗留模拟身份不能解锁工作台、桌面和窄屏选择器。邮件审批专项覆盖共享记录、组织必填、驳回、重复处理、存储失败、跨标签页及过期链接。

截图输出到系统临时目录 `poc-isolation-qa` / `poc-isolation-qa-build` / `approval-mail-review-qa`。构建必须指定独立临时输出目录，禁止覆盖 `public/admin-vue` 或 `admin-runtime`。

## 验证记录

- 通过：110 项相关 Node 单测，以及账号状态、启用申请、申请字段三个专项断言脚本。
- 通过：完整 ESLint、TypeScript 类型检查、0914 设计合同检查；本次新增布局及选择器样式增量检查 0 违规。
- 通过：演示开启与关闭两种生产构建；开启构建下完整登录/申请/审批隔离浏览器测试，关闭构建下隐藏入口、拒绝演示直链和后台认证检查。
- 通过：开发服务与生产构建下的邮件审批浏览器回归。生产模式正常路径拒绝伪造演示审批记录；演示路径保留无账号审批。
- 通过：1440×900、1280×720、390×844 登录下拉和独立审批页几何断言及截图检查；下拉按剩余空间向上或向下展开。
- 通过：最终隔离构建的外壳冒烟检查；本地管理员密码及测试密码 canary 均未出现在 JavaScript 产物中。
- 通过：本地 `http://127.0.0.1:5176/admin-vue/login` 和 `/admin-vue/poc/login` 返回 200，供用户验收。
- 环境说明：沙箱首次类型检查因依赖链接读取及增量缓存权限失败；在获准访问依赖的本地环境重新运行后通过，没有通过删类型或降低检查规则规避。
- 保留的既有构建提示：Sass legacy API、部分大 chunk；不在本次范围内扩展重构。
- 未执行：线上部署、推送/提交、真实后端认证端到端测试。管理员认证通过浏览器拦截测试验证原接口契约，未使用真实密码对线上发起登录。

原 `test:poc-login:browser` 入口现转到共享隔离回归套件，避免继续验证已取消的 `preview_user` 自动登录行为；不再由该脚本自动对真实管理员账号发起登录。


## 2026-10-26 双环境演示发布配置

NEW 与正式站的独立浏览器 POC 使用 `VITE_AUTH_MODE=server`、`VITE_POC_LOGIN_ENABLED=true`、`VITE_PERMISSION_LAB=false` 构建。必须显式保留这一发布配置：普通生产构建默认不开放独立演示入口。

正常 `/admin-vue/` 保留服务器认证；演示选择器进入 `/admin-vue/poc/` 独立路由和存储，不生成真实登录会话。审批邮件的同浏览器演示继续在两个精确域名开放。真实 ADFS、真实邮件和后端匿名审批不在本次发布范围，DEV-only SQLite 实验服务不部署或映射到公网。

本轮分别基于各环境实际已发布源码集成最新 main，NEW 既有积分管理扩展继续保留，不借发布将其覆盖或移入正式的其他代码线。发布版本、执行账号与时间以两个环境各自的实际发布记录为准。

## 2026-11-10 内部免密演示修正

用户确认采用“POC 模拟 ADFS，内部直接进入演示”，并明确管理员应访问完整工作台。内部面板不渲染密码或 OTP；选择管理员或不填账号点击 ADFS 登录，进入完整工作台首页，保留全部原菜单、顶部、AI 助手和业务本地数据，不显示独立审批导航。首次访问与禁用账号复用无密码模拟结果解析及已有审批状态，不调用账号密码接口。

这不是实际 IdP/ADFS 接入：不创建真实后台会话，不改变服务器账号、Cookie 或权限。完整管理员工作台只在明确会话标记和开启开关同时存在时恢复；刷新保留，退出移除标记并返回正常登录。生产构建只允许既有静态资源读取，真实业务请求及表单提交受限。正常外部登录保留原密码校验。

本轮验收结果以交付记录和实际 NEW 发布台账为准；上述 2026-10-23 验证记录不代表本轮重新执行。正式环境需单独授权后发布。
