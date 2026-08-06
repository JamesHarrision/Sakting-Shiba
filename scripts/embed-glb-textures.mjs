import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";

const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function parseGlb(path) {
  const bytes = readFileSync(path);
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) {
    throw new Error(`${path} is not a glTF 2.0 binary.`);
  }

  let json;
  let binary = Buffer.alloc(0);
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === JSON_CHUNK) json = JSON.parse(data.toString("utf8"));
    if (type === BIN_CHUNK) binary = Buffer.from(data);
    offset += 8 + length;
  }
  if (!json) throw new Error(`${path} has no JSON chunk.`);
  return { json, binary };
}

function pad(buffer, byte = 0) {
  const padding = (4 - (buffer.length % 4)) % 4;
  return padding === 0 ? buffer : Buffer.concat([buffer, Buffer.alloc(padding, byte)]);
}

function mimeType(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";
  return "image/png";
}

export function embedExternalTextures(inputPath, outputPath) {
  const input = resolve(inputPath);
  const output = resolve(outputPath);
  const { json, binary } = parseGlb(input);
  const declaredLength = json.buffers?.[0]?.byteLength ?? binary.length;
  let packedBinary = Buffer.from(binary.subarray(0, declaredLength));
  let embeddedCount = 0;

  json.bufferViews ??= [];
  for (const image of json.images ?? []) {
    if (!image.uri || image.uri.startsWith("data:")) continue;

    packedBinary = pad(packedBinary);
    const texturePath = resolve(dirname(input), decodeURIComponent(image.uri));
    const texture = readFileSync(texturePath);
    const byteOffset = packedBinary.length;
    packedBinary = Buffer.concat([packedBinary, texture]);
    image.bufferView = json.bufferViews.length;
    image.mimeType = mimeType(texturePath);
    delete image.uri;
    json.bufferViews.push({ buffer: 0, byteOffset, byteLength: texture.length });
    embeddedCount++;
  }

  packedBinary = pad(packedBinary);
  json.buffers ??= [{}];
  json.buffers[0].byteLength = packedBinary.length;

  const jsonChunk = pad(Buffer.from(JSON.stringify(json), "utf8"), 0x20);
  const outputBytes = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + packedBinary.length);
  outputBytes.writeUInt32LE(0x46546c67, 0);
  outputBytes.writeUInt32LE(2, 4);
  outputBytes.writeUInt32LE(outputBytes.length, 8);
  outputBytes.writeUInt32LE(jsonChunk.length, 12);
  outputBytes.writeUInt32LE(JSON_CHUNK, 16);
  jsonChunk.copy(outputBytes, 20);
  const binHeader = 20 + jsonChunk.length;
  outputBytes.writeUInt32LE(packedBinary.length, binHeader);
  outputBytes.writeUInt32LE(BIN_CHUNK, binHeader + 4);
  packedBinary.copy(outputBytes, binHeader + 8);

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, outputBytes);
  return embeddedCount;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    throw new Error("Usage: node scripts/embed-glb-textures.mjs <input.glb> <output.glb>");
  }
  const count = embedExternalTextures(inputPath, outputPath);
  console.log(`Embedded ${count} texture(s): ${outputPath}`);
}
