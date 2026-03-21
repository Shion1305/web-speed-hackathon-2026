import Encoding from "encoding-japanese";
import * as MusicMetadata from "music-metadata";

interface SoundMetadata {
  artist?: string;
  title?: string;
}

function decodeMetadataText(value: Buffer): string | undefined {
  const cleaned = value.subarray(0, value.indexOf(0x00) >= 0 ? value.indexOf(0x00) : value.length);
  if (cleaned.length === 0) {
    return undefined;
  }

  const decoded = Encoding.convert(cleaned, {
    from: "AUTO",
    to: "UNICODE",
    type: "string",
  }).trim();

  return decoded.length > 0 ? decoded : undefined;
}

function parseWaveInfoMetadata(data: Buffer): SoundMetadata {
  if (data.length < 12) {
    return {};
  }
  if (data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WAVE") {
    return {};
  }

  let artist: string | undefined;
  let title: string | undefined;
  let offset = 12;

  while (offset + 8 <= data.length) {
    const chunkId = data.toString("ascii", offset, offset + 4);
    const chunkSize = data.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = Math.min(chunkStart + chunkSize, data.length);

    if (chunkId === "LIST" && chunkStart + 4 <= chunkEnd) {
      const listType = data.toString("ascii", chunkStart, chunkStart + 4);
      if (listType === "INFO") {
        let infoOffset = chunkStart + 4;
        while (infoOffset + 8 <= chunkEnd) {
          const infoId = data.toString("ascii", infoOffset, infoOffset + 4);
          const infoSize = data.readUInt32LE(infoOffset + 4);
          const infoStart = infoOffset + 8;
          const infoEnd = Math.min(infoStart + infoSize, chunkEnd);
          const value = data.subarray(infoStart, infoEnd);

          if (infoId === "IART") {
            artist = decodeMetadataText(value) ?? artist;
          } else if (infoId === "INAM") {
            title = decodeMetadataText(value) ?? title;
          }

          infoOffset = infoStart + infoSize + (infoSize % 2);
        }
      }
    }

    if (artist !== undefined && title !== undefined) {
      break;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  return { artist, title };
}

export async function extractMetadataFromSound(data: Buffer): Promise<SoundMetadata> {
  const waveInfoMetadata = parseWaveInfoMetadata(data);
  if (waveInfoMetadata.artist !== undefined || waveInfoMetadata.title !== undefined) {
    return waveInfoMetadata;
  }

  try {
    const metadata = await MusicMetadata.parseBuffer(data);
    return {
      artist: metadata.common.artist,
      title: metadata.common.title,
    };
  } catch {
    return {
      artist: undefined,
      title: undefined,
    };
  }
}
