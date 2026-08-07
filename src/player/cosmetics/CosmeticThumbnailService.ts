import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { ensureGltfLoader } from "../../assets/registerGltfLoader";
import {
  COSMETICS,
  type CosmeticItem
} from "../../config/visual/cosmeticsConfig";

/**
 * Renders each cosmetic GLB once into an offscreen canvas and returns a small
 * PNG data URL, so the store can show real mini images instead of color
 * swatches. Items without a model keep the swatch fallback.
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
    scene.clearColor = new Color4(0.06, 0.09, 0.13, 1);
    const light = new HemisphericLight("thumb-light", new Vector3(0, 1, 0), scene);
    light.intensity = 0.8;
    const target = new Vector3(0, 0.4, 0);
    const camera = new ArcRotateCamera(
      "thumb-cam",
      Math.PI / 4,
      Math.PI / 2.3,
      3.4,
      target,
      scene
    );
    camera.setTarget(target);

    try {
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
          container.addAllToScene();
          const dataUrl = canvas.toDataURL("image/png");
          this.thumbnails.set(item.id, dataUrl);
          container.removeAllFromScene();
          container.dispose();
        } catch {
          // Broken model -> keep swatch fallback
        }
      }
    } finally {
      engine.dispose();
    }

    return Object.fromEntries(this.thumbnails);
  }

  get(itemId: string): string | undefined {
    return this.thumbnails.get(itemId);
  }
}

// Reuse the same glob resolution as the in-game layer
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
