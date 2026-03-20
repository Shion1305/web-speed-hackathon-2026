import { promises as fs } from "fs";
import path from "path";

import { Router } from "express";
import { fileTypeFromBuffer } from "file-type";
import httpErrors from "http-errors";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

// 変換した画像の拡張子
const EXTENSION = "jpg";
const DERIVATIVE_WIDTHS = [480, 960, 1600] as const;

async function writeImageDerivatives(imageId: string, sourceBuffer: Buffer): Promise<void> {
  const imageDir = path.resolve(UPLOAD_PATH, "./images");
  const source = sharp(sourceBuffer, { failOn: "none" }).rotate();

  await source
    .clone()
    .webp({ quality: 80 })
    .toFile(path.resolve(imageDir, `${imageId}.webp`));

  await Promise.all(
    DERIVATIVE_WIDTHS.flatMap((width) => {
      const base = source.clone().resize({ width, withoutEnlargement: true });
      return [
        base
          .clone()
          .jpeg({ quality: 82, mozjpeg: true })
          .toFile(path.resolve(imageDir, `${imageId}-w${width}.jpg`)),
        base
          .clone()
          .webp({ quality: 80 })
          .toFile(path.resolve(imageDir, `${imageId}-w${width}.webp`)),
      ];
    }),
  );
}

export const imageRouter = Router();

imageRouter.post("/images", async (req, res) => {
  if (req.session.userId === undefined) {
    throw new httpErrors.Unauthorized();
  }
  if (Buffer.isBuffer(req.body) === false) {
    throw new httpErrors.BadRequest();
  }

  const type = await fileTypeFromBuffer(req.body);
  if (type === undefined || type.ext !== EXTENSION) {
    throw new httpErrors.BadRequest("Invalid file type");
  }

  const imageId = uuidv4();

  const filePath = path.resolve(UPLOAD_PATH, `./images/${imageId}.${EXTENSION}`);
  await fs.mkdir(path.resolve(UPLOAD_PATH, "images"), { recursive: true });
  await fs.writeFile(filePath, req.body);

  // 元画像保存を優先し、派生画像生成はバックグラウンドで進める
  void writeImageDerivatives(imageId, req.body).catch((error: unknown) => {
    console.warn("Failed to generate image derivatives", { imageId, error });
  });

  return res.status(200).type("application/json").send({ id: imageId });
});
