import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Material } from "@babylonjs/core/Materials/material";
import { describe, expect, it } from "vitest";

import { tintMaterial } from "../../world/player/materialTint";

describe("tintMaterial", () => {
  const tint = new Color3(0.2, 0.7, 0.5);

  it.each(["albedoColor", "baseColor", "diffuseColor"] as const)(
    "supports GLB material color property %s",
    (property) => {
      const color = Color3.White();
      const material = { [property]: color } as unknown as Material;

      expect(tintMaterial(material, tint)).toBe(true);
      expect(color.asArray()).toEqual(tint.asArray());
    }
  );

  it("tints every child of a multi material", () => {
    const first = Color3.White();
    const second = Color3.White();
    const material = {
      subMaterials: [
        { albedoColor: first },
        { diffuseColor: second },
        null
      ]
    } as unknown as Material;

    expect(tintMaterial(material, tint)).toBe(true);
    expect(first.asArray()).toEqual(tint.asArray());
    expect(second.asArray()).toEqual(tint.asArray());
  });

  it("hides a GLB base texture for a color skin and restores it for default", () => {
    const texture = { name: "original color texture" };
    const material = {
      albedoColor: Color3.White(),
      albedoTexture: texture
    } as unknown as Material;

    tintMaterial(material, tint, { useOriginalTexture: false });
    expect((material as unknown as { albedoTexture: unknown }).albedoTexture)
      .toBeNull();

    tintMaterial(material, Color3.White(), { useOriginalTexture: true });
    expect((material as unknown as { albedoTexture: unknown }).albedoTexture)
      .toBe(texture);
  });
});
