import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";

import "../../assets/registerGltfLoader";
import { optimizePropContainer } from "../../world/props/PropAssetLoader";

describe("scoped glTF runtime", () => {
  it.each([
    "public/assets/models/player/cat.glb",
    "public/assets/models/player/skateboard.glb",
    "src/assets/models/props/lamp.glb"
  ])("loads the shipped glTF 2 asset %s", async (assetPath) => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const bytes = new Uint8Array(readFileSync(resolve(assetPath)));
    const container = await LoadAssetContainerAsync(bytes, scene, {
      pluginExtension: ".glb",
      name: assetPath
    });

    expect(container.meshes.length).toBeGreaterThan(0);
    container.dispose();
    scene.dispose();
    engine.dispose();
  });

  it("keeps the normalized building as one reusable mesh", async () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const assetPath = "src/assets/models/props/building.glb";
    const bytes = new Uint8Array(readFileSync(resolve(assetPath)));
    const container = await LoadAssetContainerAsync(bytes, scene, {
      pluginExtension: ".glb",
      name: assetPath
    });

    expect(container.meshes.filter((mesh) => mesh.getTotalVertices() > 0).length)
      .toBe(1);
    const template = optimizePropContainer(container, "building");

    expect(template.getTotalVertices()).toBeGreaterThan(0);
    expect(template.isEnabled()).toBe(false);
    expect(scene.meshes.filter((mesh) => !mesh.isDisposed())).toEqual([template]);
    template.dispose(false, true);
    scene.dispose();
    engine.dispose();
  });
});
