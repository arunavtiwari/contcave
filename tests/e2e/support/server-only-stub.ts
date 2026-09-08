import Module from "module";

type ModuleLoader = (request: string, parent?: NodeModule | null, isMain?: boolean) => unknown;
type ModuleWithLoader = typeof Module & { _load: ModuleLoader };

declare global {
  var __contcaveServerOnlyStubInstalled: boolean | undefined;
}

export function installServerOnlyStub() {
  if (globalThis.__contcaveServerOnlyStubInstalled) return;

  const moduleWithLoader = Module as ModuleWithLoader;
  const originalLoad = moduleWithLoader._load;

  moduleWithLoader._load = function loadWithServerOnlyStub(request, parent, isMain) {
    if (request === "server-only") return {};
    return originalLoad.call(this, request, parent, isMain);
  };

  globalThis.__contcaveServerOnlyStubInstalled = true;
}
