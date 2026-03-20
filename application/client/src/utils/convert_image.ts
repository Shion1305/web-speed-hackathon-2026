import { initializeImageMagick, ImageMagick, MagickFormat } from "@imagemagick/magick-wasm";
import magickWasmUrl from "@imagemagick/magick-wasm/magick.wasm?binary";
import { dump, insert, ImageIFD } from "piexifjs";

interface Options {
  extension: MagickFormat;
}

interface ConvertedImage {
  alt: string;
  blob: Blob;
}

export async function convertImage(file: File, options: Options): Promise<ConvertedImage> {
  await initializeImageMagick(new URL(magickWasmUrl, location.origin));

  const byteArray = new Uint8Array(await file.arrayBuffer());
  const binaryDecoder = new TextDecoder("latin1");

  return new Promise((resolve) => {
    ImageMagick.read(byteArray, (img) => {
      img.format = options.extension;

      const comment = img.comment;

      img.write((output) => {
        if (comment == null) {
          resolve({ alt: "", blob: new Blob([output as Uint8Array<ArrayBuffer>]) });
          return;
        }

        // ImageMagick では EXIF の ImageDescription フィールドに保存されているデータが
        // 非標準の Comment フィールドに移されてしまうため
        // piexifjs を使って ImageDescription フィールドに書き込む
        const binary = binaryDecoder.decode(output as Uint8Array<ArrayBuffer>);
        const descriptionBinary = binaryDecoder.decode(new TextEncoder().encode(comment));
        const exifStr = dump({ "0th": { [ImageIFD.ImageDescription]: descriptionBinary } });
        const outputWithExif = insert(exifStr, binary);
        const bytes = new Uint8Array(outputWithExif.length);
        for (let index = 0; index < outputWithExif.length; index += 1) {
          bytes[index] = outputWithExif.charCodeAt(index);
        }
        resolve({ alt: comment, blob: new Blob([bytes]) });
      });
    });
  });
}
