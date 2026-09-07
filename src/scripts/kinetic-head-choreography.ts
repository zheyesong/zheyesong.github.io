const KINETIC_PLAYBACK_RATE = 1.5;
export const KINETIC_SEQUENCE_DURATION = 7000 / KINETIC_PLAYBACK_RATE;

const LAYERS_PER_MOTOR_MODULE = 1;
const MODULE_COUNT = 63;
const FULL_TURN = Math.PI * 2;
const MOTOR_BANK_SIZE = 9;
const DIRECTION_BANK_SIZE = 18;

type LayerTimeline = {
  direction: number;
  camOffset: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function motorProgress(value: number) {
  const progress = clamp(value);
  const ramp = 0.12;
  const velocityArea = 1 - ramp;

  if (progress < ramp) {
    return (progress * progress) / (2 * ramp * velocityArea);
  }
  if (progress <= 1 - ramp) {
    return (progress - ramp / 2) / velocityArea;
  }

  const remaining = 1 - progress;
  return 1 - (remaining * remaining) / (2 * ramp * velocityArea);
}

function createTimeline(index: number): LayerTimeline {
  const moduleIndex = Math.min(
    MODULE_COUNT - 1,
    Math.floor(index / LAYERS_PER_MOTOR_MODULE),
  );
  const bankIndex = Math.floor(moduleIndex / MOTOR_BANK_SIZE);
  const channelIndex = moduleIndex % MOTOR_BANK_SIZE;
  const mirroredChannel = bankIndex % 2 === 0
    ? channelIndex
    : MOTOR_BANK_SIZE - 1 - channelIndex;
  const channelOffset = (mirroredChannel - (MOTOR_BANK_SIZE - 1) / 2) * 0.04;
  const bankTrim = (bankIndex - 3) * 0.004;

  return {
    direction: Math.floor(moduleIndex / DIRECTION_BANK_SIZE) % 2 === 0 ? 1 : -1,
    camOffset: channelOffset + bankTrim,
  };
}

export function createKineticTimelines(layerCount: number) {
  return Array.from({ length: layerCount }, (_, index) => createTimeline(index));
}

export function sampleKineticAngle(timeline: LayerTimeline, elapsed: number) {
  const progress = motorProgress(elapsed / KINETIC_SEQUENCE_DURATION);
  const camEnvelope = Math.sin(Math.PI * progress);
  const continuousTravel = progress + timeline.camOffset * camEnvelope;

  return timeline.direction * FULL_TURN * continuousTravel;
}
