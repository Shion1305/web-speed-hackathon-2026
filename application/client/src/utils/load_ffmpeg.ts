import { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegPromise: Promise<FFmpeg> | undefined;

export async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegPromise != null) {
    return ffmpegPromise;
  }

  ffmpegPromise = (async () => {
    const ffmpeg = new FFmpeg();
    const [{ default: coreURL }, { default: wasmURL }] = await Promise.all([
      import("@ffmpeg/core?binary"),
      import("@ffmpeg/core/wasm?binary"),
    ]);

    await ffmpeg.load({ coreURL, wasmURL });
    return ffmpeg;
  })().catch((err) => {
    ffmpegPromise = undefined;
    throw err;
  });

  return ffmpegPromise;
}

export function releaseFFmpeg() {
  // FFmpeg を使い回し、動画・音声投稿時の再初期化コストを避ける
}
