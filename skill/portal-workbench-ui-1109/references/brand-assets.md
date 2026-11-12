# 品牌与资产规范

## 1. 品牌标识 Logo

### 1.1 Logo 基础信息

| 属性 | 值 |
|---|---|
| 工作台确认素材 | 随包 `assets/logo-full.png`、`assets/logo-icon.png`、`assets/favicon.png` |
| 推荐用法 | 使用随包本地素材与相对资源路径，不依赖外链 |
| 本地资产 | 见 `assets/logos/` |

### 1.2 随包 Logo 资产

| 文件 | 说明 | 推荐场景 |
|---|---|---|
| `assets/logos/LenovoLogo-Chinese_POS-Red-H.png` | 红底横版品牌主标，1600×321 | 品牌露出、封面、较强品牌展示 |
| `assets/logos/LenovoLogo-Chinese_POS-Black-H.png` | 黑色横版，1600×321 | 浅色背景的 Lenovo 品牌露出 |
| `assets/logos/LenovoLogo-Chinese_POS-1Color-H.png` | 单色横版，1600×321 | 受限色彩场景 |
| `assets/logos/LenovoLogo-Chinese_REV-1Color-H.png` | 反白横版，1600×321 | 局部深色承载背景；未来明确恢复深色主题后使用 |
| `assets/logo-full.png` | Lenovo＋联想组合标，2560×512 | 当前展开侧栏和产品级品牌露出 |
| `assets/logo-icon.png` | 红底白色 L，512×512 | 当前收起侧栏和紧凑产品入口 |
| `assets/favicon.png` | 浏览器标签页图标，32×32 | 工作台 favicon |
| `assets/logos/LenovoLogo-w.jpg` | Lenovo 方形紧凑标，200×200 | Lenovo 品牌独立小尺寸场景，不替代产品图标 |

### 1.3 使用规则

- Logo 不可变色、不可拉伸、不可裁切、不可加描边、不可重排。
- 背景必须保持足够对比度；浅底优先黑色 / 红色横版，深底优先反白横版。
- 当前侧栏展开态使用 `assets/logo-full.png`；收起态使用 `assets/logo-icon.png`。
- Logo 周围保留安全区，不贴边、不与导航文字混排过近。
- 不要把 Logo 当作按钮、状态图标或装饰纹理使用。
- 随包没有竖版 Logo；竖向场景先登记缺口，不得旋转、裁切或虚构资产路径。

### 1.4 工作台确认落位（2026-10-26）

- 展开：使用 `assets/logo-full.png`（Lenovo＋联想组合图），沿用目标项目原有展示尺寸、左侧位置与垂直居中布局，仅替换图片。1015 Vue 保留现有 `height:23px`、`max-width:114px`、`object-fit:contain` 规则，不将原图像素尺寸直接用作 CSS 尺寸。
- 收起：使用 `assets/logo-icon.png`，实际图像展示为 `22×22px`，在收起侧栏头部水平、垂直居中。图片无内边距、边框、圆角、背景底座或阴影；头部命中区域、展开按钮和原有悬停展开行为保持原合同。
- 标签页：使用 `assets/favicon.png`（32×32 PNG），通过 `link rel="icon" type="image/png"` 引用；按浏览器标准尺寸显示。
- 三张图片均使用确认素材原色、保持原比例并完整显示，不拉伸、不裁切、不重绘。后续 PM 原型、UI 设计和研发沿用此合同。

## 2. 品牌色与 UI 主色关系

当前乐享工作台 UI 功能主色为 `#3370FF`，用于按钮、链接、选中态、焦点环和关键强调。Logo 保持品牌原色，不强制把所有 UI 主色改成 Logo 红。

建议关系：

- **Logo**：使用品牌资产原色。
- **功能 UI**：继续使用 `--color-primary: #3370FF`。
- **危险 / 删除**：使用 `--color-danger`，不要用 Logo 红代替。
- **AI 点缀色**：默认等于主色，如需区分可补紫色系并登记为 Token。

如团队决定将产品主色统一为联想红，必须同步修改 `design-tokens.md`、`assets/base.css`、图表主色、焦点环、选中态和状态映射，不能只改按钮。

## 3. 品牌落位建议

| 场景 | 建议 |
|---|---|
| App Shell 侧栏 | Logo 放侧栏顶部，与一级导航同列 |
| 侧栏收起 | 使用紧凑小标，居中展示 |
| 顶栏 | 不重复大 Logo，可放产品名 / 面包屑 |
| 登录 / 空状态 | 可适度增强品牌露出 |
| 局部深色承载面 | Logo 不变色，按背景对比度切换反白版本；当前发布不据此启用全局深色主题 |

## 4. 禁止事项

- 不要重新绘制 Lenovo Logo。
- 不要使用未经登记的品牌变体。
- 不要为了适配局部深色背景或未来深色主题而给 Logo 临时加滤镜。
- 不要把 Logo 红作为错误色、警告色或状态色混用。
