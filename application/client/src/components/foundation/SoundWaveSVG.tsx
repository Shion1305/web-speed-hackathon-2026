import { useEffect, useRef, useState } from "react";

interface ParsedData {
  max: number;
  peaks: number[];
}

async function calculate(data: ArrayBuffer): Promise<ParsedData> {
  const AudioContextClass =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (AudioContextClass == null) {
    return { max: 0, peaks: [] };
  }

  const audioCtx = new AudioContextClass();

  // 音声をデコードする
  const buffer = await audioCtx.decodeAudioData(data.slice(0));
  await audioCtx.close();

  const leftData = buffer.getChannelData(0);
  const rightData =
    buffer.numberOfChannels >= 2 ? buffer.getChannelData(1) : buffer.getChannelData(0);

  const chunkSize = Math.ceil(leftData.length / 100);
  const peaks: number[] = [];
  let max = 0;

  for (let start = 0; start < leftData.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, leftData.length);
    let sum = 0;

    for (let i = start; i < end; i += 1) {
      sum += (Math.abs(leftData[i] ?? 0) + Math.abs(rightData[i] ?? 0)) / 2;
    }

    const peak = sum / Math.max(end - start, 1);
    peaks.push(peak);
    if (peak > max) {
      max = peak;
    }
  }

  return { max, peaks };
}

interface Props {
  soundData: ArrayBuffer;
}

export const SoundWaveSVG = ({ soundData }: Props) => {
  const uniqueIdRef = useRef(Math.random().toString(16));
  const [{ max, peaks }, setPeaks] = useState<ParsedData>({
    max: 0,
    peaks: [],
  });

  useEffect(() => {
    calculate(soundData).then(({ max, peaks }) => {
      setPeaks({ max, peaks });
    });
  }, [soundData]);

  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 1">
      {peaks.map((peak, idx) => {
        const ratio = peak / max;
        return (
          <rect
            key={`${uniqueIdRef.current}#${idx}`}
            fill="var(--color-cax-accent)"
            height={ratio}
            width="1"
            x={idx}
            y={1 - ratio}
          />
        );
      })}
    </svg>
  );
};
