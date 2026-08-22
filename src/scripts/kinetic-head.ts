import { createElement, Rotate3D } from 'lucide';
import {
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Texture,
} from 'three';
import {
  createKineticTimelines,
  KINETIC_SEQUENCE_DURATION,
  sampleKineticAngle,
} from './kinetic-head-choreography';
import {
  createKineticHeadLayers,
  KINETIC_LAYER_COUNT,
} from './kinetic-head-geometry';

const MAX_PIXEL_RATIO = 1.5;
const VISUAL_TRANSITION_DURATION = 240;
const TARGET_FRAME_INTERVAL = 1000 / 30;

type KineticHeadElement = HTMLElement & {
  kineticCleanup?: () => void;
};

function installControlIcon(trigger: HTMLButtonElement) {
  trigger.replaceChildren(
    createElement(Rotate3D, {
      width: 18,
      height: 18,
      strokeWidth: 1.6,
      'aria-hidden': 'true',
    }),
  );
}

function getMaximumWrappedAngle(angles: number[]) {
  return angles.reduce((maximum, angle) => {
    const wrapped = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
    return Math.max(maximum, wrapped);
  }, 0);
}

async function initialiseKineticHead(root: KineticHeadElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-kinetic-canvas]');
  const trigger = root.querySelector<HTMLButtonElement>('[data-kinetic-trigger]');
  if (!canvas || !trigger) return;

  root.kineticCleanup?.();
  installControlIcon(trigger);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.dataset.reducedMotion = String(reducedMotion);
  if (reducedMotion) return;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
  } catch (error) {
    console.warn('The kinetic sculpture could not start WebGL.', error);
    trigger.hidden = true;
    return;
  }

  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0xffffff, 0);

  const scene = new Scene();
  const camera = new OrthographicCamera(-4, 4, 5, -5, 0.1, 100);
  camera.position.set(0, 0, 18);
  camera.lookAt(new Vector3());

  const surfaceMaterial = new MeshBasicMaterial({
    color: new Color(0xffffff),
    side: DoubleSide,
    toneMapped: false,
    transparent: true,
    alphaTest: 0.08,
  });
  const cutMaterial = new MeshBasicMaterial({
    color: new Color(0x151816),
    side: DoubleSide,
    toneMapped: false,
  });

  let portraitTexture: Texture | undefined;
  let frameId = 0;
  let transitionTimer = 0;
  let lastRenderedTime = 0;
  let running = false;
  let disposed = false;
  let startTime = 0;

  const disposeSharedResources = () => {
    surfaceMaterial.dispose();
    cutMaterial.dispose();
    portraitTexture?.dispose();
    renderer.dispose();
  };

  try {
    portraitTexture = await new TextureLoader().loadAsync('/assets/kinetic-head-texture.png');
    portraitTexture.colorSpace = SRGBColorSpace;
    portraitTexture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    surfaceMaterial.map = portraitTexture;
    surfaceMaterial.needsUpdate = true;

    const { group, layers, height } = await createKineticHeadLayers({
      'front-projection': surfaceMaterial,
      'mirror-steel': surfaceMaterial,
      'dark-cuts': cutMaterial,
    });
    if (disposed) {
      group.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      return;
    }
    if (layers.length !== KINETIC_LAYER_COUNT) {
      throw new Error(`Expected ${KINETIC_LAYER_COUNT} solid layers, received ${layers.length}.`);
    }

    scene.add(group);
    const timelines = createKineticTimelines(layers.length);

    const resize = () => {
      const width = Math.max(1, root.clientWidth);
      const heightPixels = Math.max(1, root.clientHeight);
      const aspect = width / heightPixels;
      const viewHeight = height * 1.09;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.left = -(viewHeight * aspect) / 2;
      camera.right = (viewHeight * aspect) / 2;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
      renderer.setSize(width, heightPixels, false);
      renderer.render(scene, camera);
      root.dataset.frameRendered = 'true';
    };

    const renderFrame = (time: number) => {
      const sequenceEnd = startTime + KINETIC_SEQUENCE_DURATION;
      if (time < sequenceEnd && time - lastRenderedTime < TARGET_FRAME_INTERVAL) {
        frameId = requestAnimationFrame(renderFrame);
        return;
      }
      lastRenderedTime = time;
      const elapsed = Math.max(0, Math.min(time - startTime, KINETIC_SEQUENCE_DURATION));
      const angles = layers.map((layer, index) => {
        const angle = sampleKineticAngle(timelines[index], elapsed);
        layer.mesh.rotation.y = angle;
        return angle;
      });

      renderer.render(scene, camera);
      root.dataset.elapsed = String(Math.round(elapsed));
      root.dataset.maxLayerAngle = getMaximumWrappedAngle(angles).toFixed(4);

      if (elapsed < KINETIC_SEQUENCE_DURATION) {
        frameId = requestAnimationFrame(renderFrame);
        return;
      }

      layers.forEach(({ mesh }) => {
        mesh.rotation.y = 0;
      });
      renderer.render(scene, camera);
      root.dataset.canvasActive = 'false';
      root.dataset.maxLayerAngle = '0.0000';
      transitionTimer = window.setTimeout(() => {
        running = false;
        root.dataset.running = 'false';
        trigger.disabled = false;
        trigger.setAttribute('aria-label', 'Play sculpture rotation');
        trigger.dataset.tooltip = 'Play sculpture rotation';
      }, VISUAL_TRANSITION_DURATION);
    };

    const play = () => {
      if (running || disposed) return;
      running = true;
      startTime = performance.now() + VISUAL_TRANSITION_DURATION;
      lastRenderedTime = 0;
      root.dataset.running = 'true';
      root.dataset.canvasActive = 'true';
      root.dataset.elapsed = '0';
      trigger.disabled = true;
      trigger.setAttribute('aria-label', 'Sculpture rotation in progress');
      trigger.dataset.tooltip = 'Sculpture rotation in progress';
      frameId = requestAnimationFrame(renderFrame);
    };

    const playFromPointer = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') play();
    };
    const playFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      play();
    };
    const loseContext = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frameId);
      window.clearTimeout(transitionTimer);
      root.dataset.ready = 'false';
      root.dataset.running = 'false';
      root.dataset.canvasActive = 'false';
      trigger.hidden = true;
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(root);
    trigger.addEventListener('click', play);
    trigger.addEventListener('keydown', playFromKeyboard);
    root.addEventListener('pointerenter', playFromPointer);
    canvas.addEventListener('webglcontextlost', loseContext);

    root.dataset.layerCount = String(layers.length);
    root.dataset.geometryMode = 'image-driven-solid-glb';
    root.dataset.running = 'false';
    root.dataset.canvasActive = 'false';
    root.dataset.maxLayerAngle = '0.0000';
    root.dataset.ready = 'true';
    resize();

    root.kineticCleanup = () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(transitionTimer);
      resizeObserver.disconnect();
      trigger.removeEventListener('click', play);
      trigger.removeEventListener('keydown', playFromKeyboard);
      root.removeEventListener('pointerenter', playFromPointer);
      canvas.removeEventListener('webglcontextlost', loseContext);
      group.traverse((object) => {
        if (object instanceof Mesh) object.geometry.dispose();
      });
      disposeSharedResources();
    };
  } catch (error) {
    console.warn('The kinetic sculpture asset could not be prepared.', error);
    root.dataset.ready = 'false';
    root.dataset.running = 'false';
    trigger.hidden = true;
    disposeSharedResources();
  }
}

export function initKineticHeads() {
  document.querySelectorAll<KineticHeadElement>('[data-kinetic-head]').forEach((root) => {
    void initialiseKineticHead(root);
  });
}
