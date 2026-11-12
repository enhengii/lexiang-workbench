# 乐享 AI 工作台 — Vue 3 源码包

本目录是门户工作台主维护源码。仓库根目录的 `public/admin-vue/` 是构建产物，不是源码入口。

## 技术栈

- Vue 3 + Vite 5
- Vue Router 4
- Pinia
- TypeScript strict mode
- ECharts 5
- 基础路径 `/admin-vue/`

## 设计合同

开始页面设计、实现或评审前，读取：

```text
../skill/portal-workbench-ui-1109/SKILL.md
```

该 Skill 是 PM、UI 和研发共用的可移植分发副本。将当前目录作为 `<app-root>`；不依赖个人机器路径、固定项目目录名或项目/Skill 哈希。

默认设计合同为 1109，0818 等目录作为历史副本保留。本轮接入沿用当前功能及权限边界，附件中的历史业务描述不覆盖后续确认的产品需求。

## 快速启动

```bash
pnpm install --frozen-lockfile
pnpm dev
```

默认访问 `/admin-vue/`。代理后端不可用时，部分页面会使用预览或回退数据；这不代表真实 API 状态已经验收。

## 验证

```bash
pnpm guard:design-skill
pnpm test:design-skill-guard
pnpm lint
pnpm typecheck
pnpm build
pnpm smoke:shell
```

如默认 smoke 端口被占用，可指定其他空闲端口：

```bash
PORTAL_SMOKE_PORT=4174 pnpm smoke:shell
```

`guard:design-skill` 保留 Skill 类型、建议版本、全局 CSS 和封板表面的兼容性警告，并固定运行随仓库 1109 的原版一致性检查器。附件元信息、资源、模板、页面矩阵及当前路由不一致会返回非零。`dev`、`build` 在启动 Vite 前直接执行同一入口和既有产品合同回归，不依赖包管理器是否启用 `predev` / `prebuild` 钩子。守卫不计算或要求内容哈希；环境变量指定的 Skill 目录只参与元信息比较，不替换实际执行的检查器或当前 Vue 工程。

默认检查不自动扫描产品样式。修改内容槽 Vue/CSS/SCSS 时，逐个传入相对本目录的路径；含空格的路径须加引号：

```bash
pnpm guard:design-skill --changed-file src/views/ExampleView.vue --changed-file src/components/ExamplePanel.vue
```

检查器扫描传入文件的全部样式块，而非仅扫描 Git 改动行。`--changed-file` 检查发现违规即阻断；若只需登记现有差异，单独运行：

```bash
pnpm guard:design-skill --guard-all
```

`--guard-all` 只把页面及组件的存量样式差异降为提示，附件与路由错误仍会失败。不能与 `--changed-file` 混用，也不能通过 `--project` 改变工程范围。全局样式需要显式传入；模板内联样式和外链 `<style src>` 不在此检查器的扫描范围。

部分专项规范与附件检查器的通用集合存在差异，例如内容标题的 19px 字号、6px 装饰圆角和 3px 说明间距。应记录精确例外并按对应专项规范复核，不能只为通过检查而改回旧样式。静态检查通过不等于本轮浏览器视觉、交互或后端联调通过；附件中的截图及验收登记也不能代替当前版本的验证。

## 维护边界

- 页面和壳层实现位于 `src/`。
- 公共 token 与已登记全局样式位于 `src/assets/`；页面私有样式优先放在对应 Vue SFC。
- `public/admin-runtime/` 只承载已登记兼容资源，不新增散落的全局 DOM bridge。
- `NativeWorkbenchPage` 只用于页面矩阵中登记的隐藏/详情兼容路由。
- `public/admin-vue/`、`node_modules/`、`.vite/`、`dist/` 和 `tsconfig.tsbuildinfo` 不进入归档。
