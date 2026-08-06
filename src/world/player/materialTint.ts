import type { Material } from "@babylonjs/core/Materials/material";
import type { Color3 } from "@babylonjs/core/Maths/math.color";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture";

interface TintableMaterial extends Material {
  albedoColor?: Color3;
  baseColor?: Color3;
  diffuseColor?: Color3;
  albedoTexture?: BaseTexture | null;
  baseColorTexture?: BaseTexture | null;
  diffuseTexture?: BaseTexture | null;
  subMaterials?: Array<Material | null>;
}

export interface MaterialTintOptions {
  readonly useOriginalTexture?: boolean;
}

interface OriginalTextures {
  readonly albedoTexture?: BaseTexture | null;
  readonly baseColorTexture?: BaseTexture | null;
  readonly diffuseTexture?: BaseTexture | null;
}

const originalTextures = new WeakMap<Material, OriginalTextures>();

export function tintMaterial(
  material: Material | null,
  color: Readonly<Color3>,
  options: Readonly<MaterialTintOptions> = {},
  visited = new Set<Material>()
): boolean {
  if (!material || visited.has(material)) return false;
  visited.add(material);

  const tintable = material as TintableMaterial;
  let didTint = copyColor(tintable.albedoColor, color);
  didTint = copyColor(tintable.baseColor, color) || didTint;
  didTint = copyColor(tintable.diffuseColor, color) || didTint;
  updateBaseTextures(material, tintable, options.useOriginalTexture ?? true);

  for (const child of tintable.subMaterials ?? []) {
    didTint = tintMaterial(child, color, options, visited) || didTint;
  }

  return didTint;
}

function updateBaseTextures(
  material: Material,
  tintable: TintableMaterial,
  useOriginalTexture: boolean
): void {
  let original = originalTextures.get(material);
  if (!original) {
    original = {
      ...(hasProperty(tintable, "albedoTexture")
        ? { albedoTexture: tintable.albedoTexture }
        : {}),
      ...(hasProperty(tintable, "baseColorTexture")
        ? { baseColorTexture: tintable.baseColorTexture }
        : {}),
      ...(hasProperty(tintable, "diffuseTexture")
        ? { diffuseTexture: tintable.diffuseTexture }
        : {})
    };
    originalTextures.set(material, original);
  }

  if (hasProperty(tintable, "albedoTexture")) {
    tintable.albedoTexture = useOriginalTexture
      ? original.albedoTexture ?? null
      : null;
  }
  if (hasProperty(tintable, "baseColorTexture")) {
    tintable.baseColorTexture = useOriginalTexture
      ? original.baseColorTexture ?? null
      : null;
  }
  if (hasProperty(tintable, "diffuseTexture")) {
    tintable.diffuseTexture = useOriginalTexture
      ? original.diffuseTexture ?? null
      : null;
  }
}

function hasProperty(
  material: TintableMaterial,
  property: "albedoTexture" | "baseColorTexture" | "diffuseTexture"
): boolean {
  return property in material;
}

function copyColor(target: Color3 | undefined, source: Readonly<Color3>): boolean {
  if (!target) return false;
  target.copyFromFloats(source.r, source.g, source.b);
  return true;
}
