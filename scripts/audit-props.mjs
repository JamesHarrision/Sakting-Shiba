// Temporary audit script for prop GLBs (run: node scripts/audit-props.mjs)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIR = "src/assets/models/props";
const files = readdirSync(DIR).filter((f) => f.endsWith(".glb"));

function parseGLB(path) {
  const buf = readFileSync(path);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));
  let bin = null;
  let offset = 20 + jsonLen;
  const header2 = buf.readUInt32LE(offset);
  const type = buf.readUInt32LE(offset + 4);
  if (type === 0x004e4942) {
    bin = buf.subarray(offset + 8, offset + 8 + header2);
  }
  return { json, bin };
}

function mat4(a) {
  return [
    a[0], a[1], a[2], a[3],
    a[4], a[5], a[6], a[7],
    a[8], a[9], a[10], a[11],
    a[12], a[13], a[14], a[15],
  ];
}
function mul(A, B) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c * 4 + r] = A[r] * B[c * 4] + A[4 + r] * B[c * 4 + 1] + A[8 + r] * B[c * 4 + 2] + A[12 + r] * B[c * 4 + 3];
  }
  return o;
}
function transformPoint(m, p) {
  const [x, y, z] = p;
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  ];
}

for (const file of files.sort()) {
  const { json, bin } = parseGLB(join(DIR, file));
  const nodes = json.nodes ?? [];
  const scenes = json.scenes ?? [{ nodes: [] }];
  const sceneRoots = scenes[0]?.nodes ?? [];

  // node world matrices (assumes parent index < child index as in glTF convention)
  const world = new Array(nodes.length);
  const nodeMesh = new Array(nodes.length).fill(-1);
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    nodeMesh[i] = n.mesh ?? -1;
    const local = n.matrix ? mat4(n.matrix) : (() => {
      const t = n.translation ?? [0, 0, 0];
      const r = n.rotation ?? [0, 0, 0, 1];
      const s = n.scale ?? [1, 1, 1];
      const [qx, qy, qz, qw] = r;
      const R = [
        1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw), 0,
        2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw), 0,
        2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy), 0,
        0, 0, 0, 1,
      ];
      const T = [1,0,0,0, 0,1,0,0, 0,0,1,0, t[0],t[1],t[2],1];
      const S = [s[0],0,0,0, 0,s[1],0,0, 0,0,s[2],0, 0,0,0,1];
      return mul(T, mul(R, S));
    })();
    world[i] = mul(local, world[n.parent ?? -1] ?? [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }

  // per-mesh world bbox
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  let meshesFound = 0;
  for (let i = 0; i < nodes.length; i++) {
    const meshIdx = nodeMesh[i];
    if (meshIdx < 0) continue;
    const mesh = json.meshes[meshIdx];
    meshesFound++;
    for (const prim of mesh.primitives) {
      const posAcc = json.accessors[prim.attributes.POSITION];
      const a = posAcc.min;
      const b = posAcc.max;
      const corners = [
        [a[0],a[1],a[2]],[b[0],a[1],a[2]],[a[0],b[1],a[2]],[a[0],a[1],b[2]],
        [b[0],b[1],a[2]],[b[0],a[1],b[2]],[a[0],b[1],b[2]],[b[0],b[1],b[2]],
      ];
      for (const c of corners) {
        const w = transformPoint(world[i], c);
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], w[k]);
          max[k] = Math.max(max[k], w[k]);
        }
      }
    }
  }

  const dims = max.map((v, k) => +(v - min[k]).toFixed(3));
  const roots = sceneRoots.map((ri) => {
    const n = nodes[ri];
    return `${n.name ?? "node" + ri} trs=${JSON.stringify({ t: n.translation ?? [0,0,0], r: n.rotation ?? [0,0,0,1], s: n.scale ?? [1,1,1] })}`;
  });
  console.log(
    `\n${file}: ${meshesFound} mesh-node(s), ${(json.materials ?? []).length} mat(s), ${(json.textures ?? []).length} tex(s)` +
    `\n  world bbox min=[${min.map(v=>v.toFixed(3)).join(",")}] max=[${max.map(v=>v.toFixed(3)).join(",")}] dims=[${dims.join(",")}]` +
    `\n  roots: ${roots.join(" | ")}`
  );
}
