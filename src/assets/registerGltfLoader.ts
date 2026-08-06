let runtimePromise: Promise<unknown> | undefined;

/** Loads the GLB parser only when model preloading begins. */
export function ensureGltfLoader(): Promise<unknown> {
  runtimePromise ??= import("./gltfRuntime");
  return runtimePromise;
}
