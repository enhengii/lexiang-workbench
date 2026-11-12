# 字体与排版规范

## 1. 字体族

| 用途 | 字体栈 | 说明 |
|---|---|---|
| 标题 | `"Source Han Sans CN", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif` | 中文后台标题，清晰克制 |
| 正文 / 界面 | `"Source Han Sans CN", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif` | 表单、表格、导航、按钮 |
| 等宽内容 | `"JetBrains Mono", "SF Mono", ui-monospace, monospace` | ID、Key、哈希、日志、JSON、数字；JetBrains Mono 可用时优先，但不是强依赖 |

> 说明：本 Skill 随包提供思源黑体文件供 HTML POC 和静态原型使用；业务工程生产接入仍需确认授权与加载方式。

## 2. 字号阶梯

| Token | 值 | 用途 |
|---|---|---|
| `--text-xs` | `12px` | 标签、表格副信息、helper、错误文字 |
| `--text-sm` | `13px` | 表格、表单、按钮，后台主力字号 |
| `--text-base` | `14px` | 正文说明 |
| `--text-md` | `16px` | 卡片标题、重要字段 |
| `--text-lg` | `18px` | 区块标题 |
| `--text-xl` | `20px` | 大号强调标题；不用于 ContentPageHeader |
| `--text-2xl` | `24px` | 大标题、引导页标题 |
| `--text-3xl` | `30px` | 关键指标数字 |

## 3. 字重与行高

| Token | 值 | 用途 |
|---|---|---|
| `--font-weight-normal` / `--fw-normal` | `400` | 正文 |
| `--font-weight-medium` / `--fw-medium` | `500` | 表头、标签、按钮 |
| `--font-weight-semibold` / `--fw-semibold` | `600` | 卡片标题、页面标题 |
| `--font-weight-bold` / `--fw-bold` | `700` | 关键数字、强标题 |
| `--leading-tight` | `1.3` | 标题 |
| `--leading-normal` | `1.5` | 正文 / 界面 |
| `--leading-relaxed` | `1.7` | 长说明文本 |

## 4. 排版规则

- 页面标题必须复用 `ContentPageHeader` 专项排版：`19px/1.35/700` 主标题与 `12px/1.65` 副标题；不得从通用字号阶梯拼装。
- 表格、表单、按钮默认 `--text-sm`。
- 关键指标数字可使用 `--text-3xl` + 当前等宽回退栈；首选字体缺失时不得改变布局或阻塞页面。
- ID、Key、哈希、数字列、日志和 JSON 使用等宽字体。
- 中文界面保持短句，避免一行过长；说明文字优先控制在一行到两行。
- 中英文之间留一个空格；英文专有名词保持官方写法：GPU、API、JSON、Token、URL。
