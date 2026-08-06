import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
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
  "skyline",
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
  it("enables the building GLB only through the merged-mesh path", () => {
    expect(getPropEntry("building").useAsset).toBe(true);
    expect(getPropEntry("building").mergeMeshes).toBe(true);
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

  it("clones a merged building template without requiring an asset container", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const materials = new MaterialsRegistry(scene);
    const template = MeshBuilder.CreateBox("building-template", {}, scene);
    template.setEnabled(false);
    const loader = {
      has: () => true,
      getOptimizedTemplate: () => template,
      getContainer: () => undefined
    } as unknown as PropAssetLoader;
    const factory = new PropFactory(scene, materials, loader);
    const parent = new TransformNode("props", scene);

    const handle = factory.create(
      "building",
      parent,
      new Vector3(4, 0, 12),
      11
    );
    const clone = scene.meshes.find(
      (mesh) => mesh.name === "prop-building-optimized-instance"
    );

    expect(clone?.isEnabled()).toBe(true);
    expect(clone?.parent?.parent).toBe(parent);
    handle.dispose();
    expect(clone?.isDisposed()).toBe(true);
    template.dispose();
    materials.dispose();
    scene.dispose();
    engine.dispose();
  });
});
