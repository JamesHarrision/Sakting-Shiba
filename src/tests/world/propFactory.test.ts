import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";

import { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import { PropAssetLoader } from "../../world/props/PropAssetLoader";
import { PropFactory } from "../../world/props/PropFactory";
import { getPropEntry } from "../../config/visual/props.config";

function createFactory(): {
  scene: Scene;
  factory: PropFactory;
  loader: PropAssetLoader;
  dispose: () => void;
} {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const materials = new MaterialsRegistry(scene);
  const loader = new PropAssetLoader();
  loader.setScene(scene);
  const factory = new PropFactory(scene, materials, loader);

  return {
    scene,
    factory,
    loader,
    dispose: () => {
      loader.dispose();
      materials.dispose();
      scene.dispose();
      engine.dispose();
    }
  };
}

const ALL_PROP_KINDS = [
  "building",
  "lamp",
  "fence",
  "box",
  "cone",
  "dumpster",
  "tree",
  "plant",
  "vent",
  "ac",
  "pipe",
  "antenna",
  "warningLight",
  "barrier"
] as const;

describe("PropFactory", () => {
  it("keeps the 107-node building source asset out of the runtime budget", () => {
    expect(getPropEntry("building").useAsset).toBe(false);
  });

  it("builds every kind procedurally and disposes them cleanly", () => {
    const { scene, factory, dispose } = createFactory();
    const parent = new TransformNode("props", scene);
    const before = scene.meshes.length;

    const handles = ALL_PROP_KINDS.map((kind, i) =>
      factory.create(kind, parent, new Vector3(i * 2, 0, 0), 100 + i)
    );

    // Each kind created at least one mesh
    for (const kind of ALL_PROP_KINDS) {
      expect(
        scene.meshes.some((m) => m.name.startsWith(`prop-${kind}`))
      ).toBe(true);
    }
    expect(scene.meshes.length).toBeGreaterThan(before);

    // Dispose removes every created mesh
    for (const handle of handles) {
      handle.dispose();
    }
    expect(scene.meshes.length).toBe(before);
    dispose();
  });

  it("uses the procedural fallback while no GLB assets are cached", () => {
    const { scene, factory, loader, dispose } = createFactory();

    // No prefetch ran -> no real assets
    for (const kind of ALL_PROP_KINDS) {
      expect(loader.has(kind)).toBe(false);
    }

    const parent = new TransformNode("props", scene);
    const before = scene.meshes.length;
    const handle = factory.create("tree", parent, new Vector3(0, 0, 0), 7);
    expect(scene.meshes.length).toBeGreaterThan(before);
    expect(parent.getChildren().length).toBeGreaterThan(0);
    handle.dispose();
    expect(scene.meshes.length).toBe(before);
    dispose();
  });
});
