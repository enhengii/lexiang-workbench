import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { withProjectPageExtensions } from './design-page-extensions.mjs'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const projectPackageRoot = dirname(projectRoot)
const consistencyArgs = parseConsistencyArgs(process.argv.slice(2))
const mainFile = join(projectRoot, 'src/main.ts')
const assetsDir = join(projectRoot, 'src/assets')
const contractFile = join(projectRoot, 'design-baseline.lock.json')
const warnings = []
const notices = []
const config = loadJson(join(projectRoot, 'design-skill.guard.json'), {})
const contract = loadJson(contractFile, null)

const allowedCssImports = contract?.allowedGlobalCssImports || [
  './assets/workbench.css',
  './assets/workbench-original-lock.css',
  './assets/workbench-prd-modules.css',
  './assets/workbench-ui-polish.css',
  './assets/workbench-preview-overrides.css',
  './assets/vue-shell-adapter.css',
]
const approvedDesignSkillCssFiles = contract?.approvedDesignSkillCssFiles || []

if (!contract) {
  warnings.push('未找到 design-baseline.lock.json，无法确认封板表面和全局样式合同。')
} else {
  for (const field of ['projectId', 'requiredSkillId', 'compatibilityPolicy']) {
    if (!contract[field]) warnings.push(`design-baseline.lock.json 缺少 ${field}。`)
  }
}

const mainText = readFileSync(mainFile, 'utf8')
const blockedCssPatterns = (contract?.blockedGlobalCssPatterns || ['ui-*-design-skill.css']).map(globToRegExp)
const cssImports = [...mainText.matchAll(/import\s+['"]([^'"]+\.css)['"]/g)].map(match => match[1])

for (const cssImport of cssImports) {
  const fileName = basename(cssImport)
  if (isDesignSkillCss(fileName) && !approvedDesignSkillCssFiles.includes(fileName)) {
    warnings.push(`src/main.ts 引入了未登记的 design-skill 全局 CSS：${cssImport}。`)
  }
  if (!allowedCssImports.includes(cssImport)) {
    warnings.push(`发现未登记的全局 CSS import：${cssImport}。新增样式优先放入 Vue scoped style；确需全局时请更新允许清单并说明影响 selector。`)
  }
}

if (cssImports.join('\n') !== allowedCssImports.join('\n')) {
  warnings.push('全局 CSS import 顺序与封板样式栈不一致，后加载样式可能覆盖顶部、侧栏、Agent composer 等已确认样式。')
}

for (const fileName of listCssFiles(assetsDir)) {
  if (isDesignSkillCss(fileName) && !approvedDesignSkillCssFiles.includes(fileName)) {
    notices.push(`src/assets 中存在未登记的 design-skill CSS：${fileName}。如需运行时使用，请加入目标项目允许清单并说明影响范围。`)
  }
}

const skillMatches = findDesignSkillMetas()
const preferredSkill = selectPreferredSkill(skillMatches)

if (skillMatches.length === 0) {
  warnings.push('未检测到设计 Skill 元信息；请确认项目随附 Skill 或通过 PORTAL_WORKBENCH_UI_SKILL_DIR 指定 Skill 目录。')
} else {
  if (skillMatches.length > 1) {
    notices.push(`检测到 ${skillMatches.length} 个设计 Skill，当前使用：${portablePath(preferredSkill.dir)}。可通过 PORTAL_WORKBENCH_UI_SKILL_DIR 显式指定。`)
  }
  compareSkillMeta(preferredSkill)
}

for (const notice of notices) console.warn(`[Design Skill Notice] ${notice}`)

if (warnings.length > 0) {
  console.warn('\n[Design Skill Warning] 当前项目存在设计合同或封板样式风险：')
  for (const warning of warnings) console.warn(`- ${warning}`)
  const protectedSurfaces = (contract?.protectedSurfaces || []).join(', ')
  console.warn(`\n上述兼容性警告不单独阻止启动；后续 1109 合同检查仍须通过。继续新增需求前请检查目标源码和统一设计合同，并避免影响封板表面：${protectedSurfaces || 'topbar, sidebar, Agent, tabs, shared components'}。\n`)
} else {
  const contractLabel = contract?.baselineName || contract?.recommendedSkillVersion || 'portable-design-contract'
  console.log(`[Design Skill Check] OK: ${contract?.requiredSkillId || 'design-skill'} ${contractLabel}`)
}

runBundledConsistencyCheck()

function parseConsistencyArgs(args) {
  const forwarded = []
  let guardAll = false
  let hasChangedFiles = false
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--guard-all' && !guardAll) {
      guardAll = true
      forwarded.push(argument)
    } else if (argument === '--changed-file') {
      const value = args[index + 1]
      if (!value?.trim() || value.startsWith('--')) {
        argumentError('--changed-file 需要一个 Vue/CSS/SCSS 文件路径。')
      }
      hasChangedFiles = true
      forwarded.push(argument, value)
      index += 1
    } else {
      argumentError(`不支持参数 ${argument}；仅支持 --changed-file <文件>（可重复）或 --guard-all。目标工程由当前检查入口固定。`)
    }
  }
  if (guardAll && hasChangedFiles) {
    argumentError('--guard-all 不能与 --changed-file 混用，以免将增量阻断降为存量提示。')
  }
  return forwarded
}

function argumentError(message) {
  console.error(`[Design Skill Error] ${message}`)
  process.exit(2)
}

function runBundledConsistencyCheck() {
  // Only execute the reviewed, bundled checker; external metadata candidates cannot replace it.
  const checker = join(projectPackageRoot, 'skill/portal-workbench-ui-1109/scripts/check-consistency.mjs')
  if (!existsSync(checker)) {
    console.error('[Design Skill Error] 缺少随仓库 1109 scripts/check-consistency.mjs，无法完成合同检查。')
    process.exit(1)
  }
  let result
  try {
    result = withProjectPageExtensions(projectRoot, dirname(dirname(checker)), (executable, pages) => {
      for (const page of pages) console.log(`[Design Skill Check] 项目新增页面登记：${page.pageId} ${page.pageType}/C9/VA-0；待本次验收。`)
      return spawnSync(process.execPath, [executable, '--project', projectRoot, ...consistencyArgs], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: false,
      })
    })
  } catch (error) {
    console.error(`[Design Skill Error] 项目页面登记检查失败：${error.message}`)
    process.exit(1)
  }
  if (result.error || result.signal || result.status === null) {
    console.error(`[Design Skill Error] 1109 合同检查未正常完成：${result.error?.message || result.signal || '无退出状态'}。`)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status)
}

function compareSkillMeta(skillMatch) {
  if (!contract || !skillMatch?.meta) return

  const { meta } = skillMatch
  if (meta.projectId && meta.projectId !== contract.projectId) {
    warnings.push(`设计 Skill projectId=${meta.projectId}，与项目类型 ${contract.projectId} 不一致。`)
  }
  if (meta.skillId !== contract.requiredSkillId) {
    warnings.push(`设计 Skill 类型不一致：项目需要 ${contract.requiredSkillId}，检测到 ${meta.skillId || '未声明'}。`)
  }

  const recommended = contract.recommendedSkillVersion
  if (!meta.skillVersion) {
    warnings.push('设计 Skill 未声明 skillVersion，无法判断是否早于当前建议版本。')
  } else if (recommended && meta.skillVersion < recommended) {
    warnings.push(`设计 Skill 版本较旧：项目建议不早于 ${recommended}，检测到 ${meta.skillVersion}。`)
  } else if (recommended && meta.skillVersion !== recommended) {
    notices.push(`检测到可移植设计 Skill ${meta.skillVersion}；项目参考版本为 ${recommended}，已按规则兼容继续。`)
  }

  if (meta.compatibilityPolicy !== 'portable-target-repository') {
    notices.push('设计 Skill 未声明 portable-target-repository；继续前请确认其不依赖个人路径或固定仓库名称。')
  }
}

function loadJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'))
  } catch (error) {
    warnings.push(`${basename(filePath)} 不是合法 JSON：${error.message}`)
    return fallback
  }
}

function listCssFiles(dirPath) {
  if (!existsSync(dirPath)) return []
  return readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.css'))
    .map(entry => entry.name)
}

function findDesignSkillMetas() {
  const candidateFiles = []
  const explicitDir = process.env.PORTAL_WORKBENCH_UI_SKILL_DIR

  if (explicitDir) candidateFiles.push(join(resolve(explicitDir), 'skill.meta.json'))
  for (const dir of config.skillSearchDirs || []) {
    candidateFiles.push(join(resolve(projectRoot, dir), 'skill.meta.json'))
  }

  return unique(candidateFiles)
    .filter(existsSync)
    .map(file => ({ file, dir: dirname(file), meta: loadJson(file, null) }))
    .filter(match => match.meta)
}

function selectPreferredSkill(matches) {
  if (matches.length === 0) return null
  const compatible = matches.filter(match => match.meta.skillId === contract?.requiredSkillId)
  const pool = compatible.length > 0 ? compatible : matches
  const exact = pool.find(match => match.meta.skillVersion === contract?.recommendedSkillVersion)
  if (exact) return exact
  return [...pool].sort((a, b) => String(b.meta.skillVersion || '').localeCompare(String(a.meta.skillVersion || '')))[0]
}

function unique(values) {
  return [...new Set(values)]
}

function portablePath(value) {
  if (value.startsWith(projectPackageRoot)) {
    return `<project-root>${value.slice(projectPackageRoot.length)}`
  }
  return '<external-skill>'
}

function globToRegExp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*')
  return new RegExp(`^${escaped}$`)
}

function isDesignSkillCss(fileName) {
  return blockedCssPatterns.some(pattern => pattern.test(fileName))
}
