import {
  downsample,
  peakFrequency,
  pointsLatex,
  rms,
  spotifyEmbedUrl,
  spotifyUri,
} from "./dsp";

describe("Audio Lab DSP", () => {
  test("validates Spotify links and URIs", () => {
    expect(
      spotifyEmbedUrl(
        "https://open.spotify.com/track/0USK9GYk8n1FQg5rUTWadD?si=test"
      )
    ).toBe(
      "https://open.spotify.com/embed/track/0USK9GYk8n1FQg5rUTWadD?utm_source=generator"
    );
    expect(spotifyEmbedUrl("spotify:album:abc123")).toBe(
      "https://open.spotify.com/embed/album/abc123?utm_source=generator"
    );
    expect(spotifyEmbedUrl("https://example.com/track/abc")).toBeUndefined();
    expect(
      spotifyUri("https://open.spotify.com/track/0USK9GYk8n1FQg5rUTWadD")
    ).toBe("spotify:track:0USK9GYk8n1FQg5rUTWadD");
  });

  test("computes RMS and peak frequency", () => {
    expect(rms(new Float32Array([1, -1]))).toBe(1);
    expect(
      peakFrequency(new Float32Array([-100, -40, -5, -20]), 48000, 8)
    ).toBe(12000);
  });

  test("downsamples and produces finite Desmos points", () => {
    expect(downsample(new Float32Array([-0.2, 0.8, -0.9, 0.1]), 2)).toEqual([
      0.800000011920929, -0.8999999761581421,
    ]);
    expect(pointsLatex([0, 1], -1, 1, 2, 3)).toBe("[(-1,3),(1,5)]");
  });
});
