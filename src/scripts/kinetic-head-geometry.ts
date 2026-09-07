import { Box3, Group, Mesh, Object3D, Vector3, type Material } from 'three';

const MODEL_URL = '/assets/models/kinetic-head.glb';
export const KINETIC_LAYER_COUNT = 63;

export type KineticLayer = {
  index: number;
  mesh: Object3D;
};

type KineticMaterialMap = Record<string, Material>;

async function loadKineticAsset() {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  return new Promise<Group>((resolve, reject) => {
    new GLTFLoader().load(MODEL_URL, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

export async function createKineticHeadLayers(materials: KineticMaterialMap) {
  const group = await loadKineticAsset();
  const layers: KineticLayer[] = [];
  const placeholderMaterials = new Set<Material>();

  group.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    sourceMaterials.forEach((material) => placeholderMaterials.add(material));
    const replacementMaterials = sourceMaterials.map(
      (material) => materials[material.name] ?? materials['mirror-steel'],
    );
    object.material = replacementMaterials.length === 1
      ? replacementMaterials[0]
      : replacementMaterials;
    object.castShadow = false;
    object.receiveShadow = false;
  });

  for (const object of group.children) {
    if (!object.name.startsWith('kinetic-layer-')) continue;
    const index = Number(object.userData.layerIndex ?? object.name.slice(-2));
    layers.push({ index, mesh: object });
  }

  layers.sort((a, b) => a.index - b.index);
  placeholderMaterials.forEach((material) => material.dispose());

  const bounds = new Box3().setFromObject(group);
  const size = bounds.getSize(new Vector3());
  const { axisPixel, imageWidth, imageHeight, worldHeight } = group.userData as Record<string, number>;
  if ([axisPixel, imageWidth, imageHeight, worldHeight].every(Number.isFinite)) {
    group.position.x = (axisPixel - imageWidth / 2) * (worldHeight / imageHeight);
  }

  return { group, layers, height: size.y };
}
