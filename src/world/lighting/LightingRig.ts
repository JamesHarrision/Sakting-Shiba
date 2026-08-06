import { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WORLD_VISUAL_CONFIG, hexToColor3 } from "../../config/visual/world-visual.config";

export class LightingRig {
  private directional!: DirectionalLight;
  private ambient!: HemisphericLight;
  private shadowGenerator: ShadowGenerator | null = null;

  constructor(private readonly scene: Scene) {}

  setup(): void {
    const cfg = WORLD_VISUAL_CONFIG;
    const skyTop = hexToColor3(cfg.skyTopColor);
    const skyHorizon = hexToColor3(cfg.skyHorizonColor);

    // Clear color (sky)
    this.scene.clearColor = new Color4(skyHorizon.r, skyHorizon.g, skyHorizon.b, 1);

    // Fog
    this.scene.fogMode = cfg.fogMode === "exp2" ? Scene.FOGMODE_EXP2 : Scene.FOGMODE_LINEAR;
    this.scene.fogColor = skyHorizon;
    if (cfg.fogMode === "exp2") {
      this.scene.fogDensity = cfg.fogDensity;
    } else {
      this.scene.fogStart = cfg.fogStart;
      this.scene.fogEnd = cfg.fogEnd;
    }

    // Ambient / hemispheric
    this.ambient = new HemisphericLight("ambient-light", new Vector3(0.1, 1, -0.1), this.scene);
    this.ambient.intensity = cfg.ambientIntensity;
    this.ambient.diffuse = skyTop;
    this.ambient.groundColor = skyHorizon.scale(0.7);

    // Directional (sun key light, slightly from front-right)
    this.directional = new DirectionalLight("sun-key", new Vector3(-0.25, -0.9, 0.55), this.scene);
    this.directional.position = new Vector3(12, 20, -15);
    this.directional.intensity = cfg.directionalIntensity;

    if (!cfg.enableDynamicShadows) {
      return;
    }

    // Dynamic shadows are optional; the default performance preset uses the
    // cheaper player blob shadow instead.
    this.shadowGenerator = new ShadowGenerator(1024, this.directional);
    this.shadowGenerator.useBlurExponentialShadowMap = false;
    this.shadowGenerator.usePercentageCloserFiltering = true;
    this.shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_LOW;
    this.shadowGenerator.bias = 0.0005;
    this.shadowGenerator.normalBias = 0.02;
    this.shadowGenerator.setDarkness(0.55);
  }

  addShadowCaster(mesh: AbstractMesh): void {
    this.shadowGenerator?.addShadowCaster(mesh);
  }

  dispose(): void {
    this.shadowGenerator?.dispose();
    this.directional?.dispose();
    this.ambient?.dispose();
  }
}
