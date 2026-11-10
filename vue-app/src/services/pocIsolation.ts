/** Demo routing/storage are separate from authentication. These are not server credentials. */
export const POC_STORAGE_PREFIX = 'leaibot-poc-demo:'

export function pocLoginEnabled(value: string | undefined, development: boolean) {
  return value === undefined ? development : value === 'true'
}

export function runtimePaths(base: string, pathname: string) {
  const normalBase = `${base.replace(/\/$/, '')}/`
  const demoBase = `${normalBase}poc/`
  const workbenchBase = `${demoBase}workbench/`
  const sandbox = pathname === demoBase.slice(0, -1) || pathname.startsWith(demoBase)
  const workbench = pathname === workbenchBase.slice(0, -1) || pathname.startsWith(workbenchBase)
  return { normalBase, demoBase, workbenchBase, sandbox, workbench, routerBase: workbench ? workbenchBase : sandbox ? demoBase : normalBase }
}

export type DemoStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function scopedDemoStorage(storage: () => DemoStorage, sandbox: boolean): DemoStorage {
  const keyFor = (key: string) => sandbox ? POC_STORAGE_PREFIX + key : key
  return {
    getItem: key => storage().getItem(keyFor(key)),
    setItem: (key, value) => storage().setItem(keyFor(key), value),
    removeItem: key => storage().removeItem(keyFor(key))
  }
}
