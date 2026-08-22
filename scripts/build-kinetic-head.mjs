import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
} from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(root, 'public/assets/kinetic-head-master.png');
const texturePath = join(root, 'public/assets/kinetic-head-texture.png');
const outputPath = join(root, 'public/assets/models/kinetic-head.glb');
const layerCount = 63;
const contourSegments = 72;
const worldHeight = 8.2;

class NodeFileReader {
  result = null;
  onloadend = null;
  onerror = null;

  async readAsArrayBuffer(blob) {
    try {
      this.result = await blob.arrayBuffer();
      this.onloadend?.({ target: this });
    } catch (error) {
      this.onerror?.(error);
    }
  }

  async readAsDataURL(blob) {
    try {
      const buffer = Buffer.from(await blob.arrayBuffer());
      this.result = `data:${blob.type};base64,${buffer.toString('base64')}`;
      this.onloadend?.({ target: this });
    } catch (error) {
      this.onerror?.(error);
    }
  }
}

globalThis.FileReader = NodeFileReader;

const luminance = (red, green, blue) => red * 0.2126 + green * 0.7152 + blue * 0.0722;

async function readSubjectMask() {
  const { data, info } = await sharp(sourcePath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const candidate = new Uint8Array(width * height);
  const exterior = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const coordinate = y * width + x;
      const pixel = coordinate * channels;
      const red = data[pixel];
      const green = data[pixel + 1];
      const blue = data[pixel + 2];
      const light = luminance(red, green, blue);
      const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
      candidate[coordinate] = light > 225 && chroma < 16 ? 1 : 0;
    }
  }

  const queue = new Int32Array(width * height);
  let queueStart = 0;
  let queueEnd = 0;
  const enqueue = (coordinate) => {
    if (!candidate[coordinate] || exterior[coordinate]) return;
    exterior[coordinate] = 1;
    queue[queueEnd] = coordinate;
    queueEnd += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (queueStart < queueEnd) {
    const coordinate = queue[queueStart];
    queueStart += 1;
    const x = coordinate % width;
    const y = Math.floor(coordinate / width);
    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        if (offsetX === 0 && offsetY === 0) continue;
        const nextX = x + offsetX;
        const nextY = y + offsetY;
        if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) continue;
        enqueue(nextY * width + nextX);
      }
    }
  }

  const alpha = Buffer.alloc(width * height);
  for (let coordinate = 0; coordinate < alpha.length; coordinate += 1) {
    alpha[coordinate] = exterior[coordinate] ? 0 : 255;
  }
  const softenedAlpha = await sharp(alpha, {
    raw: { width, height, channels: 1 },
  }).blur(0.45).toBuffer();
  await sharp(data, {
    raw: { width, height, channels },
  })
    .joinChannel(softenedAlpha, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(texturePath);

  const rowBounds = Array.from({ length: height }, () => null);
  for (let y = 0; y < height; y += 1) {
    let minimum = width;
    let maximum = -1;
    for (let x = 0; x < width; x += 1) {
      const coordinate = y * width + x;
      if (exterior[coordinate]) continue;
      const pixel = coordinate * channels;
      const light = luminance(data[pixel], data[pixel + 1], data[pixel + 2]);
      const chroma = Math.max(data[pixel], data[pixel + 1], data[pixel + 2]) -
        Math.min(data[pixel], data[pixel + 1], data[pixel + 2]);
      if (light > 247 && chroma < 8) continue;
      minimum = Math.min(minimum, x);
      maximum = Math.max(maximum, x);
    }
    if (maximum - minimum >= 8) rowBounds[y] = { minimum, maximum };
  }

  const occupiedRows = rowBounds
    .map((bounds, y) => (bounds ? y : -1))
    .filter((y) => y >= 0);
  return {
    width,
    height,
    rowBounds,
    subjectTop: occupiedRows[0],
    subjectBottom: occupiedRows.at(-1),
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function measureLayers(mask) {
  const subjectHeight = mask.subjectBottom - mask.subjectTop + 1;
  const layers = [];

  for (let index = 0; index < layerCount; index += 1) {
    const y0 = mask.subjectTop + (index * subjectHeight) / layerCount;
    const y1 = mask.subjectTop + ((index + 1) * subjectHeight) / layerCount;
    const rows = [];
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y += 1) {
      const bounds = mask.rowBounds[Math.max(0, Math.min(mask.height - 1, y))];
      if (bounds) rows.push(bounds);
    }
    if (rows.length === 0) throw new Error(`No silhouette pixels found for layer ${index}.`);
    layers.push({
      index,
      y0,
      y1,
      minimum: Math.min(...rows.map((row) => row.minimum)),
      maximum: Math.max(...rows.map((row) => row.maximum)),
    });
  }

  const axisPixel = median(
    layers.slice(3, 13).map((layer) => (layer.minimum + layer.maximum) / 2),
  );
  return { layers, axisPixel };
}

function appendQuad(target, a, b, c, d) {
  target.push(a, b, c, a, c, d);
}

function compactGeometry(positions, uvs, sourceIndices) {
  const remap = new Map();
  const compactPositions = [];
  const compactUvs = [];
  const compactIndices = sourceIndices.map((sourceIndex) => {
    if (!remap.has(sourceIndex)) {
      const compactIndex = remap.size;
      remap.set(sourceIndex, compactIndex);
      compactPositions.push(
        positions[sourceIndex * 3],
        positions[sourceIndex * 3 + 1],
        positions[sourceIndex * 3 + 2],
      );
      compactUvs.push(uvs[sourceIndex * 2], uvs[sourceIndex * 2 + 1]);
    }
    return remap.get(sourceIndex);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(compactPositions), 3),
  );
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(compactUvs), 2));
  geometry.setIndex(compactIndices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function buildLayerGeometries(layer, context) {
  const { imageWidth, imageHeight, axisPixel, worldScale, subjectTop, subjectBottom } = context;
  const centerPixel = (layer.minimum + layer.maximum) / 2;
  const halfWidthPixel = Math.max(10, (layer.maximum - layer.minimum) / 2);
  const centerX = (centerPixel - axisPixel) * worldScale;
  const halfWidth = halfWidthPixel * worldScale;
  const imageMidY = (layer.y0 + layer.y1) / 2;
  const centerY = (imageHeight / 2 - imageMidY) * worldScale;
  const layerSpacing = ((subjectBottom - subjectTop + 1) / layerCount) * worldScale;
  const thickness = layerSpacing * 0.78;
  const halfHeight = thickness / 2;
  const progress = layer.index / (layerCount - 1);
  const neckInfluence = Math.max(0, (progress - 0.66) / 0.34);
  const halfDepth = Math.max(
    0.48,
    Math.min(1.72, halfWidth * (0.64 - neckInfluence * 0.12)),
  );
  const bevelHeight = thickness * 0.12;
  const rings = [
    { y: centerY - halfHeight, scale: 0.984 },
    { y: centerY - halfHeight + bevelHeight, scale: 1 },
    { y: centerY + halfHeight - bevelHeight, scale: 1 },
    { y: centerY + halfHeight, scale: 0.984 },
  ];
  const positions = [];
  const uvs = [];
  const wrappedUvs = [];
  const frontIndices = [];
  const steelIndices = [];
  const cutIndices = [];

  for (const ring of rings) {
    for (let segment = 0; segment < contourSegments; segment += 1) {
      const angle = (segment / contourSegments) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * halfWidth * ring.scale;
      const z = Math.sin(angle) * halfDepth * ring.scale;
      positions.push(x, ring.y, z);
      const pixelX = x / worldScale + axisPixel;
      const pixelY = imageHeight / 2 - ring.y / worldScale;
      const textureV = Math.max(0, Math.min(1, 1 - pixelY / imageHeight));
      const wrappedPixelX = centerPixel + Math.sin(angle * 2) * halfWidthPixel * 0.62;
      uvs.push(
        Math.max(0, Math.min(1, pixelX / imageWidth)),
        textureV,
      );
      wrappedUvs.push(
        Math.max(0, Math.min(1, wrappedPixelX / imageWidth)),
        textureV,
      );
    }
  }

  const addBand = (ringIndex, targetForSegment) => {
    const currentOffset = ringIndex * contourSegments;
    const nextOffset = (ringIndex + 1) * contourSegments;
    for (let segment = 0; segment < contourSegments; segment += 1) {
      const next = (segment + 1) % contourSegments;
      const midpointAngle = ((segment + 0.5) / contourSegments) * Math.PI * 2;
      const target = targetForSegment(midpointAngle);
      appendQuad(
        target,
        currentOffset + segment,
        currentOffset + next,
        nextOffset + next,
        nextOffset + segment,
      );
    }
  };

  addBand(0, () => cutIndices);
  addBand(1, (angle) => (Math.sin(angle) >= 0 ? frontIndices : steelIndices));
  addBand(2, () => steelIndices);

  const capStart = positions.length / 3;
  for (let segment = 0; segment < contourSegments; segment += 1) {
    const angle = (segment / contourSegments) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * halfWidth * 0.984;
    const z = Math.sin(angle) * halfDepth * 0.984;
    positions.push(x, centerY - halfHeight, z);
    uvs.push(0.5, 0.5);
  }
  const bottomCenter = positions.length / 3;
  positions.push(centerX, centerY - halfHeight, 0);
  uvs.push(0.5, 0.5);
  const topStart = positions.length / 3;
  for (let segment = 0; segment < contourSegments; segment += 1) {
    const angle = (segment / contourSegments) * Math.PI * 2;
    const x = centerX + Math.cos(angle) * halfWidth * 0.984;
    const z = Math.sin(angle) * halfDepth * 0.984;
    positions.push(x, centerY + halfHeight, z);
    uvs.push(0.5, 0.5);
  }
  const topCenter = positions.length / 3;
  positions.push(centerX, centerY + halfHeight, 0);
  uvs.push(0.5, 0.5);

  for (let segment = 0; segment < contourSegments; segment += 1) {
    const next = (segment + 1) % contourSegments;
    cutIndices.push(bottomCenter, capStart + next, capStart + segment);
    cutIndices.push(topCenter, topStart + segment, topStart + next);
  }

  return {
    front: compactGeometry(positions, uvs, frontIndices),
    steel: compactGeometry(positions, wrappedUvs, steelIndices),
    cuts: compactGeometry(positions, uvs, cutIndices),
  };
}

async function exportBinary(scene) {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(scene, resolve, reject, {
      binary: true,
      onlyVisible: true,
      trs: true,
    });
  });
}

const mask = await readSubjectMask();
const measurement = measureLayers(mask);
const worldScale = worldHeight / mask.height;
const frontMaterial = new MeshStandardMaterial({
  name: 'front-projection',
  color: 0xffffff,
  metalness: 0.72,
  roughness: 0.12,
  side: DoubleSide,
});
const steelMaterial = new MeshStandardMaterial({
  name: 'mirror-steel',
  color: 0xc9cecc,
  metalness: 1,
  roughness: 0.07,
  side: DoubleSide,
});
const cutMaterial = new MeshStandardMaterial({
  name: 'dark-cuts',
  color: 0x090b0a,
  metalness: 0.9,
  roughness: 0.2,
  side: DoubleSide,
});
const scene = new Scene();
scene.name = 'kinetic-head-63-layer-asset';
scene.userData = {
  source: 'kinetic-head-master.png',
  layerCount,
  axisPixel: measurement.axisPixel,
  imageWidth: mask.width,
  imageHeight: mask.height,
  worldHeight,
};

for (const layer of measurement.layers) {
  const geometries = buildLayerGeometries(layer, {
    imageWidth: mask.width,
    imageHeight: mask.height,
    axisPixel: measurement.axisPixel,
    worldScale,
    subjectTop: mask.subjectTop,
    subjectBottom: mask.subjectBottom,
  });
  const layerName = `kinetic-layer-${String(layer.index).padStart(2, '0')}`;
  const layerGroup = new Group();
  layerGroup.name = layerName;
  layerGroup.userData = { layerIndex: layer.index };
  for (const [name, geometry, material] of [
    ['front', geometries.front, frontMaterial],
    ['steel', geometries.steel, steelMaterial],
    ['cuts', geometries.cuts, cutMaterial],
  ]) {
    const mesh = new Mesh(geometry, material);
    mesh.name = `${layerName}-${name}`;
    layerGroup.add(mesh);
  }
  scene.add(layerGroup);
}

const binary = await exportBinary(scene);
await writeFile(outputPath, Buffer.from(binary));

console.log(JSON.stringify({
  outputPath,
  bytes: binary.byteLength,
  layerCount,
  sourceSize: `${mask.width}x${mask.height}`,
  texturePath,
  subjectRows: [mask.subjectTop, mask.subjectBottom],
  axisPixel: measurement.axisPixel,
}, null, 2));
