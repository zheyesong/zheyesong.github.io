import sharp from 'sharp';

// Pixel agreement alone conflates material changes with GPU edge rasterization.
// Keep a small raw error budget, AND independently protect colour, contrast and
// the high-frequency edges that make the metal layers legible. No image is
// blurred, resized or filtered before these comparisons.
export function portraitMetrics(a: Uint8Array, b: Uint8Array, width: number, height: number) {
  if (a.length !== b.length || a.length !== width * height * 3) throw new Error('Portrait dimensions differ');
  const stats = (pixels: Uint8Array) => {
    const sums = [0, 0, 0];
    let squares = 0, edgeSum = 0, edges = 0;
    const luma = (index: number) => (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
    for (let index = 0; index < pixels.length; index += 3) {
      for (let channel = 0; channel < 3; channel++) sums[channel] += pixels[index + channel];
      const value = luma(index);
      squares += value * value;
      if ((index / 3) % width < width - 1) { edgeSum += Math.abs(value - luma(index + 3)); edges++; }
      if (index + width * 3 < pixels.length) { edgeSum += Math.abs(value - luma(index + width * 3)); edges++; }
    }
    const count = width * height;
    const mean = sums.reduce((sum, value) => sum + value, 0) / (count * 3);
    return { means: sums.map((sum) => sum / count), contrast: Math.sqrt(squares / count - mean * mean), edge: edgeSum / edges };
  };
  const first = stats(a), second = stats(b);
  const meanError = a.reduce((sum, value, index) => sum + Math.abs(value - b[index]), 0) / a.length;
  return {
    meanError,
    channelBias: Math.max(...first.means.map((value, index) => Math.abs(value - second.means[index]))),
    contrastChange: Math.abs(second.contrast / first.contrast - 1),
    edgeChange: Math.abs(second.edge / first.edge - 1),
  };
}

export function portraitMatches(metrics: ReturnType<typeof portraitMetrics>) {
  return metrics.meanError < 4 && metrics.channelBias < 1 && metrics.contrastChange < 0.02 && metrics.edgeChange < 0.03;
}

export async function comparePortraits(first: Buffer, second: Buffer) {
  const a = await sharp(first).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const b = await sharp(second).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw new Error('Portrait dimensions differ');
  return portraitMetrics(a.data, b.data, a.info.width, a.info.height);
}
