# 增量设计 Guard

设计 Guard 用于阻止新增或修改的内容槽源码继续引入视觉漂移，不把未触达的历史债务一次性变成发布阻塞。

## 使用方式

```bash
node scripts/check-consistency.mjs --project <app-root> \
  --changed-file src/views/example/ExampleView.vue \
  --changed-file src/components/example/ExamplePanel.vue
```

- `--changed-file` 可重复；路径必须位于 `<app-root>` 内。
- 指定文件中的新增硬编码颜色、非登记间距、非闭集圆角和非字号阶梯会直接 FAIL。
- 不指定 `--changed-file` 时仍检查 Skill、模板、页面矩阵和路由，但不会把历史页面样式债务误判为本次失败。
- `--guard-all` 扫描当前 `src/views` 与 `src/components` 的 Vue/CSS 样式，只输出 NOTICE，用于建立整改清单，不能据此宣称页面已通过视觉验收。

## 自动检查边界

自动检查覆盖：

- `<style>` 与 CSS 中的硬编码 hex/rgb/hsl 颜色；token 声明文件除外。
- `margin`、`padding`、`gap` 中未使用 token 且不在 4px 基准闭集的数值。
- 不属于 4/8/12/9999px 闭集的圆角。
- 不属于 12/13/14/16/18/20/24/30px 阶梯的字号。
- 新路由是否登记页面矩阵、一个 T1–T7 主类型、至多一个 V1–V5 变体及 C9 状态组。

自动检查不能证明组件语义、真实状态实现、键盘流程或视觉质量。以下内容仍需页面合同与运行证据：

- Common / Domain / Page-local 组件选择是否合理。
- C9 各状态是否由真实数据和权限路径触发。
- Agent 开关/拖宽后的响应式、表格可达性和页面横向溢出。
- VA-R2 截图、运行指标、错误日志和评审结论。

确有业务例外时，不通过改正则绕过。先在页面矩阵登记 E 例外、原因、影响范围、确认结论和退出路径，再为最小范围建立命名 token 或专项合同。
