# 项目级维护规范

本项目服务 `https://leaibot.cn/`（生产正式版），前端静态页面位于 `/opt/projects/lexiang/public`。

> 注：2026-06-10 完成目录与域名归位后，本仓库（/opt/projects/lexiang，next 分支）即 leaibot.cn 正式版代码；
> new.leaibot.cn 由 /opt/projects/lexiang-new（main 分支）提供，是另一代代码线，两边不要混改。

## 必须读取的设计规范

门户工作台 `vue-app/` 的设计、修改或评审统一读取：

`skill/portal-workbench-ui-1109/SKILL.md`

再按任务读取其中对应 reference。项目内 1109 Skill 是用户提供原件的完整分发副本，PM、UI 与研发共用，继承 1028/0914/0908 设计合同；旧版目录保留作历史对照，不再作为默认规范。项目当前功能与用户已确认决定优先，具体接入与兼容说明见 `docs/design/portal-workbench-ui-1109-integration.md`，不得因应用样式回退权限或业务流程。

在设计、修改、评审或发布 `leaibot.cn` 的页面样式、交互、组件、中文文案前，必须先读取并遵循（本仓库内路径）：

`/opt/projects/lexiang/.codex/skills/lenovo-leai-pc-design/SKILL.md`

按该 skill 的 workflow 继续读取相关引用文件，尤其是：

- `references/pc-design-system.md`
- `references/layout-rules.md`
- `references/component-patterns.md`
- `references/interaction-states.md`
- `references/content-voice.md`
- `references/real-pc-dialog-reference.md`
- `references/real-pc-dialog-states.md`
- `references/asset-inventory.md`

**已定稿页面保护：Skill 升级不触发现有定稿页面改造。新版规范用于新增内容和用户明确要求修改的部分；范围外已确认的设计、交互与业务行为保持原样。**

### 门户工作台 Vue 子项目边界

- `vue-app/` 是门户工作台完整 Vue 工程，`public/admin-vue/` 是其构建产物；不得把正式站其他页面规则反向覆盖到门户工作台。
- 左侧导航、顶部静态页签、中间业务内容槽与右侧 Agent 构成统一外壳。
- AI 结果报告通过 Topbar 单一选择器进入内容槽；报告页退出按钮统一为“关闭”，不恢复“保存”。
- 页面适配以中间内容槽实际宽度为准；Agent 展开和拖宽后不得产生页面级横向滚动。
- 构建与发布时必须保留 `public/admin-vue/admin-runtime/`，尤其不得覆盖 `workbench-geo.js` 和 `workbench-pages.js`。
- 在 `vue-app/` 中至少执行 `pnpm guard:design-skill`、`pnpm lint`、`pnpm typecheck`、`pnpm build` 和 `pnpm smoke:shell`。

### 门户工作台调整日志发布记录（强制）

门户工作台每条调整记录必须分别保留 `new 预览` 和 `正式环境` 的发布人、发布时间与版本。发布人只表示实际执行对应环境发布的服务器账号，不得用 Git 作者、AI 名称或部署文件所有者代替。

每次完成环境发布后，在执行发布的个人工作区运行：

```bash
scripts/record-portal-workbench-release.sh new <记录标识> "<调整日志标题>"
scripts/record-portal-workbench-release.sh formal <记录标识> "<调整日志标题>"
```

- `new` 和 `formal` 必须分别在对应环境真正发布完成后记录，不能提前合并成一条。
- 脚本默认读取当前服务器登录账号、北京时间和当前 Git 版本；只有代执行场景才能通过明确环境变量覆盖发布人。
- 脚本使用共享文件锁和原子写入，同一份只读台账会同步给两个链接；不得手工覆盖整个台账 JSON。
- 历史记录只按服务器发布证据补录。无法确认某个环境的发布人或时间时，保留“历史未记录”，不能根据提交作者猜测。

## 实施要求

- UI 必须使用联想乐享超级智能体 PC 端规范，不要自行引入不在规范内的主色、紫色渐变、玻璃拟态或营销页式大背景。
- 修改 `public/index.html` 或相关静态资源前，先对照 skill 中的色彩、字体、间距、圆角、导航、输入框、状态与中文文案规则。
- 线上发布前至少检查 `/`、`/shop-chat`、`/b-chat`、`/biz-chat` 四个路径。
- 如需替换静态页面，先备份 `/opt/projects/lexiang/public`。

## 版本管理与更新日志（强制，所有人 / 所有 AI session 适用）

线上更新日志页：`https://leaibot.cn/changelog.html`，数据源 `public/changelog.json`，页面自动渲染、无需重启服务。

**任何上线到 leaibot.cn 的改动（功能、页面、文案、数据、修复），发布后必须在 `public/changelog.json` 追加当日条目——不管改动出自哪个人、哪个 AI 工具/session。代他人补录也算数：发现已上线的改动没有记录，先补记再继续自己的工作。**

格式约定：

- `days` 数组按日期倒序（最新的一天在最前）。
- 当天（北京时间）已存在条目 → 在该天 `items` 末尾追加，编号由页面自动续接；新的一天 → 新建 `{ "date": "YYYY-MM-DD", "items": [...] }`，编号自动从 1 开始。
- **描述必须是不懂代码、不懂开发的人能看懂的大白话**：写「用户能感知到什么变了、对他有什么用」，不写文件名、函数名、技术词。仅影响内部运营的改动，句尾注明「（内部功能，不影响购物体验）」。
- **同一天内对同一功能块的多次迭代要合并展示**：当天已有该功能条目时，更新那条为最终状态，不要重复追加；重要新功能排前、修复类排后。
- **每条末尾署名改动人 + token**：格式「——观（约2万 token）」。本地开发者在 commit message 末尾附 `[tokens:12345]`（自己 AI 会话的消耗量），服务器自动解析进日志；服务器端 session 由 token-stats.js 自动计算。
- **每日自动合并**：当天最后一次提交或新一天首次提交时，当班 AI 主动按合并规则整理条目为最终状态（无需提醒）。
- **范围限定（强制）**：只记录乐享 POC 前台体验及直接配套内容；GEO 看板、workbench 通用后台、基础设施等不写入。
- changelog.json 的改动随当次代码提交一起 commit。

## 多人协作与防覆盖（强制，开工前先读完这节）

### 覆盖是怎么发生的

8 个人在改同一个项目。覆盖的机制只有一个：**有人把一整个文件写回去，而他手上那份是旧的。**

具体表现为三种，本质完全相同：
- 编辑器/IDE 保存了几分钟前读进内存的整个文件
- AI 重写整个文件（不是改其中几行，是输出整份新内容覆盖）
- `cp` / `scp` / SFTP 上传把整个文件盖上去

这中间别人写进去的东西**全部消失，不报错、不提示冲突、git 也不知道**（因为那些改动还没进 git）。

这不是纪律问题。本节下面 5 条军规 + `edit-lock.sh` 锁 + guard-markers 哨兵 + auto-checkpoint cron，四道机制都上过，覆盖照样发生。**只要多个人写同一个文件路径，就必然发生**，只能靠让每个人写不同的路径来消灭。

### 第一步：先确认你在哪工作

对号入座，四种情况：

**A. 服务器上的 `/opt/projects/lexiang`** —— ❌ 停下。这是生产目录，8 个人共用的那一份。跑：
```bash
cd /opt/projects/lexiang && scripts/dev-worktree.sh   # 零参数，名字取登录名、端口自动挑
cd /opt/wt/<你的名字> && ./run-dev                     # 起你自己的实例，首次约 90s（在加载 339M hnsw 索引）
```

**B. 服务器上的 `/opt/wt/<你的名字>`** —— ✅ 正确，直接干活。

已建好的工作区（端口的唯一事实源是 `scripts/dev-ports.txt`，要改端口改那个文件）：

| 人 | 登录名 | 端口 | | 人 | 登录名 | 端口 |
|---|---|---|---|---|---|---|
| 白羽 | baiyu | 3002 | | 管峰 | guanfeng2 | 3014 |
| 观 | guanjf2 | 3011 | | 周悦 | zhouyue118 | 3015 |
| yejw2 | yejw2 | 3012 | | 张蕊 | zhangrui | 3013 |

**别分配这些**：3001 生产、3010 lexiang-new、3020 codex-lexiang、3061 wangyt50 旧副本、3200 lenovo-shop。这些实例不在 `/opt/wt` 下，自动扫描看不见，撞上了才发现。

**C. 自己电脑上 `git clone` 下来的这个仓库** —— ✅ 可以，但必须守两条：
```bash
git checkout -b dev/<你的名字>    # 永远不要直接在 main 上改
git pull --rebase origin main     # 开工前先拉，别基于几天前的旧代码改
# 改完 → commit → git push -u origin dev/<你的名字> → 通知白羽合并
```
**绝对不要把改好的文件用 scp / SFTP / IDE 的"上传"功能传到服务器。** 那一步就是覆盖本身——你传的是整个文件，服务器上别人这期间的改动会被你手上的旧内容盖掉。走 push + merge，git 会告诉你有没有冲突；走上传，git 什么都不知道。

**C 补充：GitHub 推不上去怎么办（`Permission denied (publickey)`）**

不用等权限，直接推到服务器——你的 SSH key 已经在服务器上了，能登服务器就能推：

```bash
git remote add server ssh://<你的登录名>@43.160.195.171/opt/projects/lexiang
git push server HEAD:refs/heads/incoming/<你的登录名>    # 分支名必须带 incoming/
```

分支名**必须**是 `incoming/<名字>`，不能用 `dev/<名字>`——`dev/*` 在服务器上已被工作区检出，git 会拒绝推送到已检出的分支。

**推完就不用管了**：服务器 cron 每 5 分钟扫一次 `incoming/*`，能干净合上的自动合进 main 并推 GitHub，然后删掉分支、飞书告知白羽。合不上（冲突）的原样留着并告警，等人处理——冲突不会被自动瞎合。所以不用再挨个通知白羽。

**D. 自己电脑上一份手工拷贝的代码（不是 clone，没有 `.git` 目录）** —— ❌ 最危险，必须先转成 C。这种情况下你手上那份从拷下来那一刻起就在变旧，改完传回去必然覆盖别人。转法：
```bash
git clone git@github.com:shuitian23-bot/lexiang-workbench.git
# 然后把你本地改动手工搬进 clone 里，之后一律走 C 的流程
```

### 工作区的一些细节

共享同一个 `.git`，一份只占 230M；db / hnsw / uploads / node_modules 全部软链回生产，不复制。**注意软链的 db 是生产库**，要造脏数据先 `cp lexiang.db` 顶掉软链，用完删掉恢复。

提交推自己的分支 `dev/<名字>`。上游是空的，`git push` 不带参数会安全报错，不会误推 main。没有 GitHub key 也没关系——服务器上所有工作区共用一个 `.git`，在生产目录 `git merge dev/<名字>` 就能合，不需要先推远端。

不要再用 `cp -r` 复制整个项目当工作区（已有 `codex-lexiang`、`~wangyt50/lexiang`）。那样改动 merge 不回来，只能手工重敲成 `[同步prod xxx]` commit，还吃磁盘。

### 合并后的临时 worktree 收尾（强制，所有 agent 适用）

**每个 agent 必须在本任务合并和必要验证完成后、最终汇报前，主动清理自己为本任务创建的临时 worktree。符合下列条件的收尾无需用户再次提醒或确认；只提交、只推分支或 PR 尚未合并，不算完成合并。** 不创建后台全盘扫描或定时删除任务。

1. **先确认代码已保留。** 刷新目标仓库的远端引用，确认本任务提交已合入目标分支，并已在远端保存；不能只看本地 `main`。通常用 `git merge-base --is-ancestor <worktree-HEAD> <已刷新的远端目标分支>` 核验。若采用 squash/rebase 合并，须核对 PR 合并记录和实际改动对应关系，不能因提交号不同直接删除或只凭标题判定。远端无法核实则保留目录并说明原因。
2. **范围只限本人本任务的临时目录。** 根据本任务创建记录和 `git worktree list --porcelain` 取得精确路径，核对所属 Git common-dir、HEAD、分支和锁定状态。进行中的 merge/rebase、`index.lock` 或嵌套仓库未处理完时不得删除。保留主 checkout、正式与 new 服务目录、`/opt/wt/<登录名>` 常驻工作区、其他人的目录和已锁定工作区。历史遗留目录需另行逐个核验，不按名字前缀或“已合并”标签批量删除。
3. **检查未提交和被忽略的内容。** 同时检查暂存区、已跟踪改动、未跟踪文件以及 ignored 内容；`git status` 为空不等于没有独有数据。`.env`、数据库、备份、发布证据和本地配置必须保留或移出临时目录并校验。只清理本任务可重建的依赖/构建产物；不得为通过检查而自动提交他人的改动、清空目录或丢弃差异。
4. **解除实际使用和依赖。** 先完成发布/测试，停止本人本任务启动的服务和监听器，退出该目录；检查运行进程、定时任务、服务配置、包管理器登记及其他工作区的入站软链接。仍有引用、权限不足或无法判断时保留目录，报告具体阻碍。删除软链接只能移除链接本身，不得跟随链接删除共享依赖、生产数据或其他工作区。
5. **使用 Git 正常移除。** 在工作区外执行 `git -C <所属仓库> worktree remove <已核验的精确路径>`。服务器上须与现有合并/检查点流程使用同一把工作区锁，获取锁后重新核验 HEAD、状态、文件和引用；不得在共享生产目录直接改文件。禁止 `--force`、`git clean -fdx`、`rm -rf`、批量 prune 或绕过锁强删。Git 拒绝移除时保留现场，查明原因后再处理。
6. **保留恢复线索并核验结果。** 默认保留个人开发分支和必要恢复引用；备份、交付证据放在被删除目录之外。确认目录及其 worktree 登记都已移除、分支仍可访问、正式/new 内容与其他人的改动未受影响。最终汇报清理数量、实际回收空间（未测量就不估报）及保留原因；不能把“规则已写入”当作“目录已清理”。

协作收尾顺序：**合并并确认远端 → 完成本次必要验证/发布 → 保存证据、停止临时服务并解除引用 → 检查工作区 → 正常移除本任务临时 worktree → 汇报。** 合并者使用了自己的临时审查目录，也必须执行同样收尾；本机独立 clone 不属于 linked worktree，不得套用 worktree 删除规则移除。

### 兜底 5 条

只在还没建工作区、必须直接动生产目录时用：

1. git 唯一事实源：改完立即 commit+push；他人未提交改动先 `checkpoint:` 快照保护再开工。
2. 改共享热点文件（public/index.html、public/admin/*、server.js、core/*）前先 `scripts/edit-lock.sh claim <标识> <文件>`，BLOCKED 则先沟通；完工 release（锁 2 小时自动过期）。
3. 整文件覆盖（cp 部署/AI 重写）前必须 diff 现场 vs 编辑基线，不一致 = 有人并行改过 → 停止覆盖，对方改动入库后重取基线重放。
4. AI 编辑循环：取基线 → 编辑副本 → 部署前 diff 校验 → 覆盖 → commit+push → 释放锁。
5. 领域分工：前台 index.html / 后台 workbench 不跨域同时开工，跨域先打招呼。
