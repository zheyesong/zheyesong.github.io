import { createKineticScene } from './kinetic-head-scene';
import {
  createKineticTimelines, KINETIC_SEQUENCE_DURATION, sampleKineticAngle,
} from './kinetic-head-choreography';

const HANDOFF_DURATION = 180;
const TARGET_FRAME_INTERVAL = 1000 / 30;

export async function initKineticHead(root: HTMLElement, signal?: AbortSignal) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-kinetic-canvas]')!;
  const trigger = root.querySelector<HTMLButtonElement>('[data-kinetic-trigger]')!;
  const view = await createKineticScene(canvas, signal);
  const timelines = createKineticTimelines(view.layers.length);
  let frameId = 0;
  let timer = 0;
  let disposed = false;
  let running = false;
  let reducedMotion = root.dataset.reducedMotion === 'true';
  let startTime = 0;
  let nextFrameTime = 0;

  const idle = () => {
    running = false;
    root.dataset.running = 'false';
    root.dataset.settling = 'false';
    root.dataset.phase = 'idle';
    trigger.disabled = false;
    trigger.setAttribute('aria-label', 'Play sculpture rotation');
    trigger.dataset.tooltip = 'Play sculpture rotation';
  };

  const stop = () => {
    cancelAnimationFrame(frameId);
    window.clearTimeout(timer);
    view.resetPose();
    view.render();
    root.dataset.canvasActive = 'false';
    root.dataset.maxLayerAngle = '0.0000';
    idle();
  };

  const resize = () => {
    if (disposed) return;
    view.resize();
    root.dataset.frameRendered = 'true';
  };

  const renderFrame = (time: number) => {
    if (disposed || reducedMotion || !running) return;
    const elapsed = Math.max(0, Math.min(time - startTime, KINETIC_SEQUENCE_DURATION));
    if (elapsed < nextFrameTime && elapsed < KINETIC_SEQUENCE_DURATION) {
      frameId = requestAnimationFrame(renderFrame);
      return;
    }
    // Anchor deadlines to the sequence clock: late rAF callbacks must not discard
    // the fractional remainder and turn a 33.3 ms cadence into repeated 50 ms gaps.
    // Skip missed deadlines without rendering catch-up frames or changing the pose.
    nextFrameTime = (Math.floor(elapsed / TARGET_FRAME_INTERVAL) + 1) * TARGET_FRAME_INTERVAL;
    let maxAngle = 0;
    view.layers.forEach(({ mesh }, index) => {
      const angle = sampleKineticAngle(timelines[index], elapsed);
      mesh.rotation.y = angle;
      maxAngle = Math.max(maxAngle, Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))));
    });
    view.render();
    root.dataset.elapsed = String(Math.round(elapsed));
    root.dataset.maxLayerAngle = maxAngle.toFixed(4);
    if (elapsed < KINETIC_SEQUENCE_DURATION) {
      frameId = requestAnimationFrame(renderFrame);
      return;
    }
    view.resetPose();
    view.render();
    root.dataset.maxLayerAngle = '0.0000';
    // Present the exact rest pose before beginning the overlay fade.
    frameId = requestAnimationFrame(() => {
      root.dataset.phase = 'leaving';
      root.dataset.settling = 'true';
      root.dataset.canvasActive = 'false';
      timer = window.setTimeout(idle, HANDOFF_DURATION);
    });
  };

  const play = () => {
    if (running || disposed || reducedMotion || !root.isConnected) return;
    running = true;
    view.resetPose();
    view.render();
    root.dataset.running = 'true';
    root.dataset.phase = 'entering';
    root.dataset.settling = 'false';
    root.dataset.elapsed = '0';
    root.dataset.maxLayerAngle = '0.0000';
    trigger.disabled = true;
    trigger.setAttribute('aria-label', 'Sculpture rotation in progress');
    trigger.dataset.tooltip = 'Sculpture rotation in progress';
    frameId = requestAnimationFrame(() => {
      root.dataset.canvasActive = 'true';
      timer = window.setTimeout(() => {
        startTime = performance.now();
        nextFrameTime = 0;
        root.dataset.phase = 'running';
        frameId = requestAnimationFrame(renderFrame);
      }, HANDOFF_DURATION);
    });
  };

  const observer = new ResizeObserver(resize);
  const dispose = () => {
    if (disposed) return;
    stop();
    disposed = true;
    observer.disconnect();
    canvas.removeEventListener('webglcontextlost', loseContext);
    view.dispose();
  };
  const loseContext = (event: Event) => {
    event.preventDefault();
    dispose();
    root.dataset.ready = 'false';
    root.dataset.phase = 'failed';
    trigger.hidden = true;
  };
  canvas.addEventListener('webglcontextlost', loseContext);
  observer.observe(root);
  root.dataset.layerCount = String(view.layers.length);
  root.dataset.geometryMode = 'image-driven-solid-glb';
  root.dataset.ready = 'true';
  root.dataset.canvasActive = 'false';
  root.dataset.maxLayerAngle = '0.0000';
  idle();
  resize();

  return {
    play,
    dispose,
    setReducedMotion(value: boolean) {
      reducedMotion = value;
      root.dataset.reducedMotion = String(value);
      if (value) stop();
    },
  };
}
