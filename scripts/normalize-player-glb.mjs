/**
 * Normalizes cosmetic player models to a single convention:
 *   Y-up, feet at Y=0, centered horizontally, facing -Z.
 *
 *   Dogs    -> 1.64 units tall, feet on ground, facing forward.
 *   Hats    -> 0.30 units tall, bottom at Y=0, centered.
 *   Boards  -> 2.28 units along Z (track direction), centered.
 *
 * Usage:  node scripts/normalize-player-glb.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { PlatformIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const KEYS = [
  { file: "hat-snapback", kind: "hat", targetHeight: 0.30 },
  { file: "hat-headphones", kind: "hat", targetHeight: 0.30 },
  { file: "dog-calico", kind: "dog", targetHeight: 1.64 },
  { file: "dog-midnight", kind: "dog", targetHeight: 1.64 },
  { file: "board-mint", kind: "board", targetLength: 2.28 },
  { file: "board-comet", kind: "board", targetLength: 2.28 },
];

const SRC_DIR = "src/assets/models/player";
const dryRun = process.argv.includes("--dry-run");
const io = new PlatformIO();
io.registerExtensions(ALL_EXTENSIONS);

for (const entry of KEYS) {
  const path = `${SRC_DIR}/${entry.file}.glb`;
  let buf;
  try {
    buf = readFileSync(path);
  } catch {
    console.error(`[SKIP] ${path} not found`);
    continue;
  }

  const binary = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const doc = await io.readBinary(binary);
  const root = doc.getRoot();
  const scene = root.getDefaultScene();
  if (!scene) {
    console.error(`[SKIP] ${entry.file} has no default scene`);
    continue;
  }

  // ── 1. Compute world bounding box ──────────────────────────
  const bbox = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };

  let meshCount = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const posAttr = prim.getAttribute("POSITION");
      if (!posAttr) continue;
      const pos = posAttr.getArray();
      if (!pos || pos.length === 0) continue;
      meshCount++;

      for (const node of root.listNodes()) {
        if (node.getMesh() !== mesh) continue;

        const trs = getNodeTRS(node);
        const m = buildMatrix(trs.translation, trs.rotation, trs.scale);

        const accMin = posAttr.getMin([]);
        const accMax = posAttr.getMax([]);
        if (!accMin || !accMax) continue;

        for (let ix = 0; ix < 2; ix++) {
          for (let iy = 0; iy < 2; iy++) {
            for (let iz = 0; iz < 2; iz++) {
              const p = [
                ix ? accMax[0] : accMin[0],
                iy ? accMax[1] : accMin[1],
                iz ? accMax[2] : accMin[2],
              ];
              const tp = transformPoint(m, p);
              if (tp[0] < bbox.min[0]) bbox.min[0] = tp[0];
              if (tp[1] < bbox.min[1]) bbox.min[1] = tp[1];
              if (tp[2] < bbox.min[2]) bbox.min[2] = tp[2];
              if (tp[0] > bbox.max[0]) bbox.max[0] = tp[0];
              if (tp[1] > bbox.max[1]) bbox.max[1] = tp[1];
              if (tp[2] > bbox.max[2]) bbox.max[2] = tp[2];
            }
          }
        }
      }
    }
  }

  if (meshCount === 0 || !isFinite(bbox.min[0])) {
    console.error(`[SKIP] ${entry.file} no mesh data`);
    continue;
  }

  const span = [
    bbox.max[0] - bbox.min[0],
    bbox.max[1] - bbox.min[1],
    bbox.max[2] - bbox.min[2],
  ];
  const center = [
    (bbox.min[0] + bbox.max[0]) / 2,
    (bbox.min[1] + bbox.max[1]) / 2,
    (bbox.min[2] + bbox.max[2]) / 2,
  ];

  console.log(
    `[${entry.file.padEnd(16)}] mesh=${meshCount}  span=[${span.map(v => v.toFixed(3)).join(" × ")}]  center=[${center.map(v => v.toFixed(3)).join(", ")}]`
  );

  // ── 2. Normalization transform ─────────────────────────────
  const t = [0, 0, 0];
  const s = [1, 1, 1];
  const r = [0, 0, 0, 1];
  let rotateY90 = false;

  const isDogOrHat = entry.kind === "dog" || entry.kind === "hat";
  const maxHoriz = Math.max(span[0], span[2]);

  if (isDogOrHat) {
    const sy = span[1] > 0 ? entry.targetHeight / span[1] : 1;
    s[0] = sy; s[1] = sy; s[2] = sy;
    t[1] = -bbox.min[1] * sy;
    t[0] = -center[0] * sy;
    t[2] = -center[2] * sy;
  } else {
    const sc = maxHoriz > 0 ? (entry.targetLength || 2.28) / maxHoriz : 1;
    s[0] = sc; s[1] = sc; s[2] = sc;
    if (span[0] > span[2] * 1.2) {
      rotateY90 = true;
      r[1] = Math.sin(Math.PI / 4);
      r[3] = Math.cos(Math.PI / 4);
    }
    t[0] = -center[0] * sc;
    t[1] = -(bbox.min[1] + bbox.max[1]) / 2 * sc;
    t[2] = -center[2] * sc;
  }

  const changed = s[0] !== 1 || s[1] !== 1 || s[2] !== 1
    || t[0] !== 0 || t[1] !== 0 || t[2] !== 0 || rotateY90;

  if (!changed) {
    console.log(`  -> already normalized`);
    continue;
  }

  console.log(
    `  -> scale [${s.map(v => v.toFixed(4)).join(", ")}]  translate [${t.map(v => v.toFixed(2)).join(", ")}]${rotateY90 ? "  rotY=90°" : ""}`
  );

  if (dryRun) {
    console.log(`  (dry-run, not written)`);
    continue;
  }

  // ── 3. Insert root normalization node ──────────────────────
  const normNode = doc.createNode(`normalized-${entry.file}`);
  normNode.setTranslation(t);
  if (rotateY90) normNode.setRotation(r);
  normNode.setScale(s);

  const oldChildren = scene.listChildren().slice();
  for (const child of oldChildren) {
    scene.removeChild(child);
    normNode.addChild(child);
  }
  scene.addChild(normNode);

  // ── 4. Write ───────────────────────────────────────────────
  const outBinary = await io.writeBinary(doc);
  writeFileSync(path, Buffer.from(outBinary.buffer, outBinary.byteOffset, outBinary.byteLength));
  console.log(`  -> written (${(outBinary.length / 1024).toFixed(0)} KB)`);
}

// ── helpers ───────────────────────────────────────────────────

function getNodeTRS(node) {
  return {
    translation: node.getTranslation() ?? [0, 0, 0],
    rotation: node.getRotation() ?? [0, 0, 0, 1],
    scale: node.getScale() ?? [1, 1, 1],
  };
}

function buildMatrix(t, r, s) {
  const [tx, ty, tz] = t;
  const [qx, qy, qz, qw] = r;
  const [sx, sy, sz] = s;
  const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
  const xx = qx * x2, xy = qx * y2, xz = qx * z2;
  const yy = qy * y2, yz = qy * z2, zz = qz * z2;
  const wx = qw * x2, wy = qw * y2, wz = qw * z2;
  return [
    (1 - (yy + zz)) * sx, (xy + wz) * sx, (xz - wy) * sx, 0,
    (xy - wz) * sy, (1 - (xx + zz)) * sy, (yz + wx) * sy, 0,
    (xz + wy) * sz, (yz - wx) * sz, (1 - (xx + yy)) * sz, 0,
    tx, ty, tz, 1,
  ];
}

function transformPoint(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}
