#!/usr/bin/env node

import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROFILE_IMAGES_DIR = path.resolve(__dirname, "../../public/images/profiles");
const PROFILE_VARIANTS_DIR = path.resolve(PROFILE_IMAGES_DIR, "variants");
const PROFILE_IMAGE_SIZES = [40, 48, 64, 128];
const CONCURRENCY = 8;

async function pathExists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generateVariantsForId(imageId) {
  const sourcePath = path.resolve(PROFILE_IMAGES_DIR, `${imageId}.jpg`);
  if (!(await pathExists(sourcePath))) {
    return;
  }

  for (const size of PROFILE_IMAGE_SIZES) {
    const jpgOutputPath = path.resolve(PROFILE_VARIANTS_DIR, `${imageId}-${size}.jpg`);
    const webpOutputPath = path.resolve(PROFILE_VARIANTS_DIR, `${imageId}-${size}.webp`);

    if (!(await pathExists(jpgOutputPath))) {
      await sharp(sourcePath)
        .resize(size, size, { fit: "cover" })
        .jpeg({ quality: 85 })
        .toFile(jpgOutputPath);
    }

    if (!(await pathExists(webpOutputPath))) {
      await sharp(sourcePath)
        .resize(size, size, { fit: "cover" })
        .webp({ quality: 82 })
        .toFile(webpOutputPath);
    }
  }
}

async function main() {
  await mkdir(PROFILE_VARIANTS_DIR, { recursive: true });

  const entries = await readdir(PROFILE_IMAGES_DIR, { withFileTypes: true });
  const profileImageIds = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".jpg"))
    .map((entry) => entry.name.slice(0, -4))
    .sort();

  if (profileImageIds.length === 0) {
    console.log("No profile JPG images found. Skip generating profile variants.");
    return;
  }

  let index = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (index < profileImageIds.length) {
      const currentIndex = index;
      index += 1;
      const imageId = profileImageIds[currentIndex];
      if (imageId === undefined) {
        return;
      }
      await generateVariantsForId(imageId);
    }
  });

  await Promise.all(workers);
  console.log(
    `Generated profile image variants: ${profileImageIds.length} images x ${PROFILE_IMAGE_SIZES.length} sizes`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
