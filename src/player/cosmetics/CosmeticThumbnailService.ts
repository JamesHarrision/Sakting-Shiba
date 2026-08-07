import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { ensureGltfLoader } from "../../assets/registerGltfLoader";
import {
  COSMETICS,
  type CosmeticItem
} from "../../config/visual/cosmeticsConfig";

/**
 * Renders each cosmetic GLB once into an offscreen canvas and returns a small
 * PNG data URL. Uses a parent TransformNode for scaling/centering so the model
 * always fits the frame, and waits for shaders to compile before capturing.
 */
export class CosmeticThumbnailService {
  private readonly thumbnails = new Map<string, string>();

  async generateAll(): Promise<Readonly<Record<string, string>>> {
    const items = COSMETICS.filter((item) => item.model);
    if (!items.length) return {};

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true
    });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.96, 0.96, 0.96, 1); // white studio background

    // Key light + subtle fill so no side of the model is fully black
    new HemisphericLight("th-ambient", new Vector3(0, 1, 0), scene).intensity = 0.5;
    const fill = new DirectionalLight("th-fill", new Vector3(-0.4, -0.3, 0.7), scene);
    fill.intensity = 0.4;

    const target = new Vector3(0, 0.3, 0);
    const camera = new ArcRotateCamera(
      "thumb-cam",
      Math.PI / 4,
      Math.PI / 2.4,
      3.6,
      target,
      scene
    );
    camera.setTarget(target);

    // A neutral matte floor catches ambient light so the model isn't floating in void
    const floor = MeshBuilder.CreateGround("th-floor", { width: 4, height: 4 }, scene);
    floor.isVisible = false; // hide the floor but its reflection helps the eyes  

    await ensureGltfLoader();

    for (const item of items) {
      const url = resolveModelUrl(item.model);
      if (!url) continue;
      try {
        const container = await SceneLoader.LoadAssetContainerAsync(
          url,
          undefined,
          scene
        );

        // Wrap everything under a calibrating root so we scale+center the
        // whole hierarchy without having to mutate individual mesh positions.
        const root = new TransformNode(`thumb-root-${item.id}`, scene);
        container.addAllToScene();
        const visibleMeshes = container.meshes.filter((m) => m.isVisible);
        for (const mesh of visibleMeshes) {
          mesh.parent = root;
        }

        // Compute raw bounding box, then scale + center
        root.scaling.setAll(1);
        root.position.set(0, 0, 0);
        const bounds = computeBounds(visibleMeshes);
        const span = Math.max(
          bounds.max.y - bounds.min.y,
          bounds.max.x - bounds.min.x,
          bounds.max.z - bounds.min.z
        );
        const scale = span > 0 ? 1.5 / span : 1;
        root.scaling.setAll(scale);
        root.position.x = -(bounds.min.x + bounds.max.x) / 2 * scale;
        root.position.y = -(bounds.min.y + bounds.max.y) / 2 * scale;
        root.position.z = -(bounds.min.z + bounds.max.z) / 2 * scale;

        // Wait until shaders + textures are compiled on the GPU
        await scene.whenReadyAsync();
        scene.render();

        const dataUrl = canvas.toDataURL("image/png");
        this.thumbnails.set(item.id, dataUrl);

        root.dispose();
        container.dispose();
      } catch {
        // Broken model -> keep swatch fallback
      }
    }

    engine.dispose();
    return Object.fromEntries(this.thumbnails);
  }

  get(itemId: string): string | undefined {
    return this.thumbnails.get(itemId);
  }
}

const SRC_MODEL_URLS = import.meta.glob("/src/assets/models/player/*.glb", {
  query: "?url",
  import: "default",
  eager: true
}) as Record<string, string>;

function resolveModelUrl(path: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("/src/")) return SRC_MODEL_URLS[path];
  return path;
}

function computeBounds(
  meshes: readonly AbstractMesh[]
): { min: Vector3; max: Vector3 } {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    const lo = box.minimumWorld;
    const hi = box.maximumWorld;
    min.x = Math.min(min.x, lo.x);
    min.y = Math.min(min.y, lo.y);
    min.z = Math.min(min.z, lo.z);
    max.x = Math.max(max.x, hi.x);
    max.y = Math.max(max.y, hi.y);
    max.z = Math.max(max.z, hi.z);
  }
  return { min, max };
}
