import test from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'design-skill-guard-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const app = join(root, 'vue-app')
  const skill = join(root, 'skill/portal-workbench-ui-1109')
  mkdirSync(join(app, 'scripts'), { recursive: true })
  for (const file of ['design-baseline.lock.json', 'design-skill.guard.json', 'design-page-extensions.json', 'package.json', 'scripts/verify-design-skill.mjs', 'scripts/design-page-extensions.mjs', 'scripts/product-contract-regression.test.mjs']) {
    cpSync(join(appRoot, file), join(app, file))
  }
  cpSync(join(appRoot, 'src'), join(app, 'src'), { recursive: true })
  cpSync(join(appRoot, '../skill/portal-workbench-ui-1109'), skill, { recursive: true })
  const oldSkill = join(root, 'skill/portal-workbench-ui-0818')
  mkdirSync(oldSkill, { recursive: true })
  cpSync(join(appRoot, '../skill/portal-workbench-ui-0818/skill.meta.json'), join(oldSkill, 'skill.meta.json'))
  const env = { ...process.env }
  delete env.PORTAL_WORKBENCH_UI_SKILL_DIR
  delete env.PORTAL_WORKBENCH_PROJECT_DIR
  return { root, app, skill, env }
}

function runGuard(f, args = [], cwd = f.app) {
  const result = spawnSync(process.execPath, [join(f.app, 'scripts/verify-design-skill.mjs'), ...args], {
    cwd, env: f.env, encoding: 'utf8', timeout: 20000,
  })
  assert.ifError(result.error)
  return { ...result, output: result.stdout + result.stderr }
}

function breakMetadata(f) {
  const file = join(f.skill, 'skill.meta.json')
  const meta = JSON.parse(readFileSync(file, 'utf8'))
  meta.skillRelease = 'broken-test-release'
  writeFileSync(file, JSON.stringify(meta))
}

test('default guard selects 1109 over the old copy and runs its real contract checker', t => {
  const result = runGuard(fixture(t))
  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /当前使用：<project-root>[\\/]skill[\\/]portal-workbench-ui-1109/)
  assert.match(result.output, /\[OK\] portal-workbench-ui-1109 metadata, assets, templates, matrix and evidence are internally consistent/)
})

test('the build command blocks invalid contracts before product tests or Vite can run', t => {
  const f = fixture(t)
  breakMetadata(f)
  const { scripts } = JSON.parse(readFileSync(join(f.app, 'package.json'), 'utf8'))
  const result = spawnSync(scripts.build, { cwd: f.app, env: f.env, shell: true, encoding: 'utf8', timeout: 20000 })
  assert.ifError(result.error)
  const output = result.stdout + result.stderr
  assert.notEqual(result.status, 0, output)
  assert.match(output, /\[FAIL\] portal-workbench-ui-1109/)
  assert.doesNotMatch(output, /login keeps the confirmed|vite.*not found|building for production/)
})

test('a missing bundled checker fails instead of silently using the legacy guard', t => {
  const f = fixture(t)
  rmSync(join(f.skill, 'scripts/check-consistency.mjs'))
  const result = runGuard(f)
  assert.notEqual(result.status, 0, result.output)
  assert.match(result.output, /1109|check-consistency/)
})

test('repeated changed-file arguments reach the checker, including a path containing spaces', t => {
  const f = fixture(t)
  writeFileSync(join(f.app, 'src/views/Guard A.vue'), '<template><div /></template><style scoped>div { margin: 5px; }</style>')
  writeFileSync(join(f.app, 'src/views/GuardB.vue'), '<template><div /></template><style scoped>div { font-size: 21px; }</style>')
  const result = runGuard(f, ['--changed-file', 'src/views/Guard A.vue', '--changed-file', 'src/views/GuardB.vue'])
  assert.notEqual(result.status, 0, result.output)
  assert.match(result.output, /Guard A\.vue/)
  assert.match(result.output, /GuardB\.vue/)
  assert.match(result.output, /扫描 2 个文件/)
})

test('guard-all reports historical styles without suppressing invalid contract metadata', t => {
  const f = fixture(t)
  writeFileSync(join(f.app, 'src/views/GuardAudit.vue'), '<style>div { margin: 5px; }</style>')
  const audit = runGuard(f, ['--guard-all'])
  assert.equal(audit.status, 0, audit.output)
  assert.match(audit.output, /设计 Guard 存量.*GuardAudit\.vue/)
  breakMetadata(f)
  const broken = runGuard(f, ['--guard-all'])
  assert.notEqual(broken.status, 0, broken.output)
  assert.match(broken.output, /\[FAIL\] portal-workbench-ui-1109/)
})

test('legacy global CSS warnings remain visible and do not replace contract checking', t => {
  const f = fixture(t)
  const main = join(f.app, 'src/main.ts')
  writeFileSync(main, readFileSync(main, 'utf8') + "\nimport './assets/unregistered.css'\n")
  const result = runGuard(f)
  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /Design Skill Warning/)
  assert.match(result.output, /\[OK\] portal-workbench-ui-1109/)
})

test('external metadata and working directory cannot replace the bundled checker or project', t => {
  const f = fixture(t)
  const external = join(f.root, 'external-skill')
  mkdirSync(join(external, 'scripts'), { recursive: true })
  cpSync(join(f.skill, 'skill.meta.json'), join(external, 'skill.meta.json'))
  writeFileSync(join(external, 'scripts/check-consistency.mjs'), "throw new Error('EXTERNAL_CHECKER_MUST_NOT_RUN')")
  f.env.PORTAL_WORKBENCH_UI_SKILL_DIR = external
  f.env.PORTAL_WORKBENCH_PROJECT_DIR = external
  const result = runGuard(f, [], f.root)
  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /\[OK\] portal-workbench-ui-1109/)
  assert.doesNotMatch(result.output, /EXTERNAL_CHECKER_MUST_NOT_RUN|项目路由文件不存在/)
})

for (const args of [
  ['--changed-fiel', 'src/views/Example.vue'],
  ['--changed-file'],
  ['--changed-file', '--guard-all'],
  ['--changed-file', ''],
  ['--project', '/tmp'],
  ['--guard-all', '--changed-file', 'src/views/Example.vue'],
]) {
  test(`invalid guard arguments fail explicitly: ${JSON.stringify(args)}`, t => {
    const result = runGuard(fixture(t), args)
    assert.notEqual(result.status, 0, result.output)
    assert.match(result.output, /Design Skill Error/)
  })
}

test('checker exit codes and signals cannot be mistaken for success', t => {
  const f = fixture(t)
  const checker = join(f.skill, 'scripts/check-consistency.mjs')
  writeFileSync(checker, 'process.exit(7)\n')
  assert.equal(runGuard(f).status, 7)
  writeFileSync(checker, "process.kill(process.pid, 'SIGTERM')\n")
  const signalled = runGuard(f)
  assert.notEqual(signalled.status, 0, signalled.output)
  assert.match(signalled.output, /SIGTERM/)
})
