import {
  Color, DoubleSide, Mesh, MeshBasicMaterial, NoToneMapping,
  OrthographicCamera, Scene, SRGBColorSpace, TextureLoader, WebGLRenderer,
  type Group, type Texture,
} from 'three';
import { createKineticHeadLayers, KINETIC_LAYER_COUNT } from './kinetic-head-geometry';
import palette from '../data/palette.json';

export const KINETIC_VIEW_WIDTH = 394;
export const KINETIC_VIEW_HEIGHT = 560;
export const KINETIC_MAX_PIXEL_RATIO = 1.5;

/** The one rendering recipe used by the interactive head and offline poster export. */
export async function createKineticScene(canvas: HTMLCanvasElement, signal?: AbortSignal) {
  const renderer = new WebGLRenderer({
    canvas, alpha: true, antialias: true, powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  // An opaque, identical paper background makes the overlay fade colour-neutral.
  renderer.setClearColor(palette.paper, 1);

  const scene = new Scene();
  const camera = new OrthographicCamera(-4, 4, 5, -5, 0.1, 100);
  camera.position.set(0, 0, 18);
  camera.lookAt(0, 0, 0);
  const surface = new MeshBasicMaterial({
    color: new Color(0xffffff), side: DoubleSide, toneMapped: false,
    transparent: true, alphaTest: 0.08,
  });
  const cuts = new MeshBasicMaterial({
    color: new Color(0x151816), side: DoubleSide, toneMapped: false,
  });
  let texture: Texture | undefined;
  let group: Group | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    group?.traverse((object) => {
      if (object instanceof Mesh) object.geometry.dispose();
    });
    surface.dispose();
    cuts.dispose();
    texture?.dispose();
    renderer.dispose();
  };

  try {
    signal?.throwIfAborted();
    texture = await new TextureLoader().loadAsync('/assets/kinetic-head-texture.webp');
    signal?.throwIfAborted();
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    surface.map = texture;
    surface.needsUpdate = true;
    const asset = await createKineticHeadLayers({
      'front-projection': surface, 'mirror-steel': surface, 'dark-cuts': cuts,
    });
    group = asset.group;
    signal?.throwIfAborted();
    if (asset.layers.length !== KINETIC_LAYER_COUNT) {
      throw new Error(`Expected ${KINETIC_LAYER_COUNT} solid layers, received ${asset.layers.length}.`);
    }
    scene.add(group);
    const render = () => { if (!disposed) renderer.render(scene, camera); };
    const resetPose = () => {
      asset.layers.forEach(({ mesh }) => { mesh.rotation.y = 0; });
    };
    const resize = () => {
      const viewHeight = asset.height * 1.09;
      const aspect = KINETIC_VIEW_WIDTH / KINETIC_VIEW_HEIGHT;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.left = -(viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.updateProjectionMatrix();
      // Match the poster's sampling grid at every CSS size and device DPR.
      // Otherwise thin horizontal layers shift during the image/canvas handoff.
      renderer.setPixelRatio(KINETIC_MAX_PIXEL_RATIO);
      renderer.setSize(KINETIC_VIEW_WIDTH, KINETIC_VIEW_HEIGHT, false);
      render();
    };
    return { layers: asset.layers, resize, resetPose, render, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
