# 资产清单（Asset Inventory）

## 1014 Agent 底部活动行图标

- 用户授权扫描项目并设计同款活动图标；运行定义位于项目 `vue-app/src/utils/agentActivityIcons.js`，渲染入口为 `AgentActivityIcon.vue`，仅用于最新输出底部活动行。
- 十类：search 搜索、read 读取、terminal 命令、skill 技能、analysis 分析、write 输出、network 联网、wait 等待、export 导出、navigate 跳转。
- 统一20×20 viewBox、显示16×16、线宽1.75（显示线宽约1.4px）、圆端点/圆连接、无填充、继承currentColor。工具轮廓复用原执行卡SVG、文档图形适配报告图标结构，其余按项目线性风格补绘，不引入外部图标库。
- 图标是带文本活动行的装饰，aria-hidden，不新增按钮及hover/active/disabled交互。颜色随活动行语义灰色、暗色/强制颜色模式继承。
- 可编辑SVG及总览是同一运行定义生成的本次设计交付，保存在本轮需求日志/用户桌面交付目录，不在Skill中复制一套运行资产；不声称已同步Figma库。

生成界面时优先复用以下随包资产，不要临时找替代字体或自造 Logo。
若需要的资产缺失，明确说明缺口并用保守占位，不要发明另一套品牌标识。

---

## 字体 Fonts

本 Skill 随包提供思源黑体（Source Han Sans CN）用于 HTML POC 和静态原型。字体规范见 `typography.md`；
业务工程落地时仍需确认授权与正式接入方式。

| 文件 | 字重 | 用途 |
|------|------|------|
| `assets/fonts/SourceHanSansCN-Regular.otf` | 400 | 正文、表格、表单 |
| `assets/fonts/SourceHanSansCN-Medium.otf` | 500 | 标签、按钮、强调文字 |
| `assets/fonts/SourceHanSansCN-Bold.otf` | 700 | 标题、关键数字 |

## Logo

品牌横版（Horizontal，1600×321）：

| 文件 | 说明 | 使用场景 |
|------|------|---------|
| `assets/logos/LenovoLogo-Chinese_POS-Red-H.png` | 红底品牌主标（POS-Red） | 品牌强调、封面、白底之外的强展示 |
| `assets/logos/LenovoLogo-Chinese_POS-Black-H.png` | 正黑版（POS-Black） | 浅色背景的标准锁版 |
| `assets/logos/LenovoLogo-Chinese_POS-1Color-H.png` | 单色版（POS-1Color） | 单色印刷 / 受限场景 |
| `assets/logos/LenovoLogo-Chinese_REV-1Color-H.png` | 反白版（REV-1Color） | 局部深色承载背景；未来明确恢复深色主题后可用于顶栏/侧栏 |

产品锁版与紧凑资产：

| 文件 | 说明 | 使用场景 |
|------|------|---------|
| `assets/logo-full.png` | Lenovo＋联想组合标（2560×512） | 当前工作台展开侧栏和产品级品牌露出 |
| `assets/logo-icon.png` | 红底白色 L（512×512，展示22×22px） | 当前工作台收起侧栏和紧凑入口 |
| `assets/favicon.png` | 浏览器标签页图标（32×32） | 工作台 favicon |
| `assets/logos/LenovoLogo-w.jpg` | Lenovo 方形紧凑标（200×200） | Lenovo 品牌独立小尺寸场景；不能替代产品图标 |

使用约定：
- 浅色背景用 `POS-Black-H` 或 `POS-Red-H`；深色承载面用 `REV-1Color-H`，保证对比度。
- 当前产品侧栏展开用 `logo-full.png` 并沿用项目原布局；收起（58px）用 `logo-icon.png`，22×22px 居中；标签页用 `favicon.png`。具体落位见 `brand-assets.md`。
- 不拉伸变形、不重新着色、不替换字体，保持锁版完整。
- 生成 HTML 原型时把用到的 Logo 复制进输出目录，用相对路径引用。
- 本 Skill 未提供竖版 Logo；需要竖版时先登记缺口，不得虚构路径或旋转横版替代。

> ⚠️ 品牌色提醒：当前 UI 设计 token 主色为蓝色 `#3370FF`，而以上为联想红品牌标识。
> 二者并存时，建议：Logo 用品牌红，功能性 UI（按钮/选中/链接）仍用 `#3370FF`，
> 避免红蓝在同一界面争夺注意力。如需把产品主色也统一为联想红，请告知，会同步调整 token。

---

## 内容槽模板

七类基础页型、一个高频组合与两个专项变体均在 `assets/` 中提供静态设计参考，并统一引用 `content-template.css`：

- `assets/content-list-template.html`
- `assets/content-summary-list-template.html`
- `assets/content-long-filter-list-template.html`
- `assets/content-dashboard-template.html`
- `assets/content-form-template.html`
- `assets/content-task-import-template.html`
- `assets/content-split-settings-template.html`
- `assets/content-config-list-template.html`
- `assets/content-workflow-template.html`
- `assets/content-report-detail-template.html`
- `assets/content-slot-component-library.html`：中间内容槽 A/B/C 组件成熟度的结构预览；只为 B/C 提供稳定资产标记，A 仍保留在来源页面。

这些文件只用于结构、状态和视觉校准；最终实现必须映射到当前 Vue 项目，不作为独立 HTML/JS 交付。

PM、UI、AI 与研发共用的 Vue 组件基线：

- `assets/vue-content-slot-components/index.ts`：组件导出入口。
- `assets/vue-content-slot-components/content-slot-components.css`：组件 token 与共享样式。
- `assets/vue-content-slot-components/components/ActionButton.vue`
- `assets/vue-content-slot-components/components/ChartPanel.vue`
- `assets/vue-content-slot-components/components/ContentPageHeader.vue`
- `assets/vue-content-slot-components/components/ContentTabs.vue`
- `assets/vue-content-slot-components/components/DataTable.vue`
- `assets/vue-content-slot-components/components/FeedbackState.vue`
- `assets/vue-content-slot-components/components/FilterBar.vue`
- `assets/vue-content-slot-components/components/FormControl.vue`
- `assets/vue-content-slot-components/components/ListSurface.vue`
- `assets/vue-content-slot-components/components/MetricCard.vue`
- `assets/vue-content-slot-components/components/MetricGrid.vue`
- `assets/vue-content-slot-components/components/Pagination.vue`
- `assets/vue-content-slot-components/components/SectionCard.vue`
- `assets/vue-content-slot-components/components/SectionHeader.vue`
- `assets/vue-content-slot-components/components/StatusTag.vue`
- `assets/vue-content-slot-components/components/TimeRangeFilter.vue`

以上为中间内容槽 B/C Vue 参考源码。PM/UI 优先用于独立原型；研发新增需求先核对项目已有映射，缺失时再适配到目标项目的共享组件层。

使用流程见 `references/content-slot-vue-library.md`。Skill Vue 参考组件是可复制设计资产，不代表产品项目已经组件化。

壳层静态参考与共享样式：

- `assets/page-template.html`：静态壳层快照，仅用于外壳关系校准。
- `assets/base.css`：壳层静态快照使用的基础样式。
- `assets/content-template.css`：十个内容槽页型模板共享样式、PageFlow/ListWorkspace 间距和 Container Query 合同。

---

## 随包范围与按需资产

本 Skill 不重复打包项目完整图标库、头像库和插画库。这不等于项目设计资产存在缺口；页面应先复用当前 0825 项目和 Figma 项目资产，并按 `icon-rules.md` 的顺序处理。

- UI 图标：当前项目已确认 SVG / 组件 → Figma 项目 icon 库 → 用户确认后补充的新 SVG。
- 助手 / 产品头像：优先复用项目现有资产；确实不存在时使用中性占位并登记。
- 空状态 / 引导插画：默认使用项目现有线性图标或简洁线性占位；只有明确业务需求才新增插画。
