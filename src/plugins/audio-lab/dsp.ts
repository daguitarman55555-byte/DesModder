export function rms(samples: Float32Array) {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
}

export function peakFrequency(
  bins: Float32Array,
  sampleRate: number,
  fftSize: number
) {
  let peak = -Infinity;
  let index = 0;
  for (let i = 1; i < bins.length; i++) {
    if (bins[i] > peak) {
      peak = bins[i];
      index = i;
    }
  }
  return (index * sampleRate) / fftSize;
}

export function downsample(samples: Float32Array, requested: number) {
  if (samples.length === 0 || requested <= 0) return [];
  const count = Math.min(samples.length, Math.floor(requested));
  const bucket = samples.length / count;
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor(index * bucket);
    const end = Math.max(start + 1, Math.floor((index + 1) * bucket));
    let minimum = Infinity;
    let maximum = -Infinity;
    for (let i = start; i < end && i < samples.length; i++) {
      minimum = Math.min(minimum, samples[i]);
      maximum = Math.max(maximum, samples[i]);
    }
    return Math.abs(maximum) >= Math.abs(minimum) ? maximum : minimum;
  });
}

export function spotifyEmbedUrl(input: string) {
  const trimmed = input.trim();
  const uri =
    /^spotify:(track|album|playlist|episode|show):([A-Za-z0-9]+)$/i.exec(
      trimmed
    );
  if (uri !== null)
    return `https://open.spotify.com/embed/${uri[1].toLowerCase()}/${uri[2]}?utm_source=generator`;
  try {
    const url = new URL(trimmed);
    if (url.hostname !== "open.spotify.com") return undefined;
    const parts = url.pathname.split("/").filter(Boolean);
    const offset = parts[0]?.startsWith("intl-") ? 1 : 0;
    const type = parts[offset];
    const id = parts[offset + 1];
    if (
      !["track", "album", "playlist", "episode", "show"].includes(type) ||
      !/^[A-Za-z0-9]+$/.test(id ?? "")
    )
      return undefined;
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator`;
  } catch {
    return undefined;
  }
}

export function pointsLatex(
  values: readonly number[],
  xMinimum: number,
  xMaximum: number,
  scale: number,
  offset: number
) {
  if (values.length === 0) return "[]";
  const divisor = Math.max(1, values.length - 1);
  return `[${values
    .map((value, index) => {
      const x = xMinimum + ((xMaximum - xMinimum) * index) / divisor;
      return `(${Number(x.toFixed(6))},${Number(
        (value * scale + offset).toFixed(6)
      )})`;
    })
    .join(",")}]`;
}
