// Inspect a single GLB's per-mesh structure (run: node scripts/inspect-glb.mjs <file>)
import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/inspect-glb.mjs <file.glb>");
  process.exit(1);
}

const buf = readFileSync(path);
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString("utf8"));

console.log(`nodes: ${json.nodes?.length ?? 0}`);
console.log(`meshes: ${json.meshes?.length ?? 0}`);
console.log(`materials: ${json.materials?.map((m) => m.name ?? "?").join(", ") ?? "none"}`);
console.log(`scene roots: ${json.scenes?.[0]?.nodes ?? []}`);

// node -> mesh + local TRS + name
for (let i = 0; i < (json.nodes ?? []).length; i++) {
  const n = json.nodes[i];
  const m = n.mesh !== undefined ? json.meshes[n.mesh] : null;
  const matName = m
    ? (m.primitives?.map((p) => (p.material !== undefined ? json.materials[p.material]?.name ?? "?" : "none")).join(",") ?? "?")
    : null;
  const trs = `t=${JSON.stringify(n.translation ?? [0,0,0])} r=${JSON.stringify(n.rotation ?? [0,0,0,1])} s=${JSON.stringify(n.scale ?? [1,1,1])}`;
  console.log(
    `  node[${i}] name="${n.name ?? ""}" mesh=${m ? n.mesh : "-"} mats=${matName} ${n.matrix ? "matrix=set" : trs}`
  );
  if (m) {
    for (const prim of m.primitives ?? []) {
      const pos = json.accessors[prim.attributes.POSITION];
      console.log(
        `       prim POS min=[${pos.min.map(v=>v.toFixed(3)).join(",")}] max=[${pos.max.map(v=>v.toFixed(3)).join(",")}]`
      );
    }
  }
}
