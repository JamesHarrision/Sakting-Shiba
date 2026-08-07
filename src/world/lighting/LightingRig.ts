import { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { WORLD_VISUAL_CONFIG, hexToColor3 } from "../../config/visual/world-visual.config";
import skyboxMorningUrl from "../../assets/textures/skybox-morning.png?url";

export class LightingRig {
  private directional!: DirectionalLight;
  private ambient!: HemisphericLight;
  private shadowGenerator: ShadowGenerator | null = null;
  private skyDome: Mesh | null = null;
  private skyMaterial: StandardMaterial | null = null;
  private skyTexture: Texture | null = null;
  private clouds: Mesh[] = [];
  private cloudMaterial: StandardMaterial | null = null;
  private cloudTexture: Texture | null = null;
  private sun: Mesh | null = null;
  private readonly cloudWrapZ = 100;
  private brightness = 1;

  constructor(private readonly scene: Scene) {}

  setup(): void {
    const cfg = WORLD_VISUAL_CONFIG;
    const skyTop = hexToColor3(cfg.skyTopColor);
    const skyHorizon = hexToColor3(cfg.skyHorizonColor);

    // Clear color (sky)
    this.scene.clearColor = new Color4(skyHorizon.r, skyHorizon.g, skyHorizon.b, 1);
    this.setupSkyDome();
    this.setupSkyDetail();

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

  /** Drifts the sky cloud layer toward the player and wraps it around. */
  updateClouds(deltaSeconds: number): void {
    if (!this.clouds.length) return;
    const speed = 4.2; // world units per second
    for (const cloud of this.clouds) {
      cloud.position.z += speed * deltaSeconds;
      if (cloud.position.z > this.cloudWrapZ) {
        cloud.position.z = -this.cloudWrapZ;
      }
    }
  }

  /** 0..1 overall scene brightness multiplier. */
  setBrightness(factor: number): void {
    this.brightness = Math.min(1, Math.max(0, factor));
    if (!this.ambient || !this.directional) return;
    const cfg = WORLD_VISUAL_CONFIG;
    this.ambient.intensity = cfg.ambientIntensity * this.brightness;
    this.directional.intensity = cfg.directionalIntensity * this.brightness;
  }

  dispose(): void {
    this.skyDome?.dispose();
    this.skyMaterial?.dispose();
    this.skyTexture?.dispose();
    this.shadowGenerator?.dispose();
    this.directional?.dispose();
    this.ambient?.dispose();
    for (const cloud of this.clouds) cloud.dispose();
    this.clouds.length = 0;
    this.cloudMaterial?.dispose();
    this.cloudTexture?.dispose();
    this.sun?.dispose();
  }

  private setupSkyDome(): void {
    this.skyDome = MeshBuilder.CreateSphere(
      "sky-dome",
      { diameter: 420, segments: 16, sideOrientation: Mesh.BACKSIDE },
      this.scene
    );
    this.skyDome.infiniteDistance = true;
    this.skyDome.isPickable = false;
    this.skyDome.applyFog = false;

    this.skyTexture = new Texture(skyboxMorningUrl, this.scene, false, true);
    this.skyTexture.coordinatesMode = Texture.EXPLICIT_MODE;
    this.skyTexture.uScale = -1;

    this.skyMaterial = new StandardMaterial("sky-dome-material", this.scene);
    this.skyMaterial.disableLighting = true;
    this.skyMaterial.backFaceCulling = false;
    this.skyMaterial.fogEnabled = false;
    this.skyMaterial.emissiveTexture = this.skyTexture;
    this.skyMaterial.diffuseColor.set(0, 0, 0);
    this.skyMaterial.specularColor.set(0, 0, 0);
    this.skyDome.material = this.skyMaterial;
  }

  /**
   * Adds depth to the plain sky: drifting semi-transparent clouds above the
   * track plus a warm sun disc with a soft halo near the horizon.
   */
  private setupSkyDetail(): void {
    const skyTop = hexToColor3(WORLD_VISUAL_CONFIG.skyTopColor);

    // ── drifting cloud layer ──────────────────────────────────
    this.cloudTexture = createCloudTexture(this.scene);
    this.cloudMaterial = new StandardMaterial("sky-clouds", this.scene);
    this.cloudMaterial.disableLighting = true;
    this.cloudMaterial.fogEnabled = false;
    this.cloudMaterial.backFaceCulling = false;
    this.cloudMaterial.emissiveColor = new Color3(1, 1, 1);
    this.cloudMaterial.opacityTexture = this.cloudTexture;
    this.cloudMaterial.alpha = 0.9;

    const cloudCount = 6;
    for (let i = 0; i < cloudCount; i++) {
      const width = 26 + (i * 7) % 20;
      const cloud = MeshBuilder.CreatePlane(
        `sky-cloud-${i}`,
        { width, height: width * 0.45 },
        this.scene
      );
      cloud.material = this.cloudMaterial;
      cloud.isPickable = false;
      cloud.applyFog = false;
      cloud.position.set(
        -24 + (i * 13) % 44,
        26 + (i * 9) % 16,
        -70 + i * 26
      );
      cloud.rotation.x = Math.PI / 2;
      this.clouds.push(cloud);
    }

    // ── sun disc + halo ───────────────────────────────────────
    const sunMat = new StandardMaterial("sky-sun", this.scene);
    sunMat.disableLighting = true;
    sunMat.fogEnabled = false;
    sunMat.emissiveColor = new Color3(1, 0.96, 0.82);
    this.sun = MeshBuilder.CreateSphere(
      "sky-sun-disc",
      { diameter: 5, segments: 12 },
      this.scene
    );
    this.sun.material = sunMat;
    this.sun.isPickable = false;
    this.sun.applyFog = false;
    this.sun.position.set(42, 44, -260);

    const haloMat = new StandardMaterial("sky-sun-halo", this.scene);
    haloMat.disableLighting = true;
    haloMat.fogEnabled = false;
    haloMat.backFaceCulling = false;
    haloMat.emissiveColor = skyTop.scale(0.9);
    haloMat.alpha = 0.35;
    const halo = MeshBuilder.CreatePlane(
      "sky-sun-halo-disc",
      { width: 90, height: 90 },
      this.scene
    );
    halo.material = haloMat;
    halo.isPickable = false;
    halo.applyFog = false;
    halo.position.copyFrom(this.sun.position);
    this.sun.addChild(halo);
  }
}

function createCloudTexture(scene: Scene): DynamicTexture {
  const dynamic = new DynamicTexture(
    "sky-clouds-texture",
    { width: 512, height: 256 },
    scene,
    true
  );
  dynamic.hasAlpha = true;
  dynamic.anisotropicFilteringLevel = 4;
  const ctx = dynamic.getContext();

  // Soft white blobs that act as the cloud alpha mask
  let seed = 7;
  const nextRandom = (): number => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 14; i++) {
    const x = nextRandom() * 512;
    const y = 256 * 0.2 + nextRandom() * 256 * 0.6;
    const radius = 26 + nextRandom() * 58;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  dynamic.update();
  return dynamic;
}
