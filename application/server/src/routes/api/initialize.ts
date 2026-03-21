import fs from "node:fs/promises";

import { Router } from "express";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";

import { cache } from "../../cache";
import { initializeSequelize } from "../../sequelize";
import { sessionStore } from "../../session";
import { clearHtmlCache, warmHtmlCache } from "../static";

export const initializeRouter = Router();

initializeRouter.post("/initialize", async (_req, res) => {
  // DBリセット
  await initializeSequelize();
  // sessionStoreをクリア
  sessionStore.clear();
  // インメモリキャッシュをクリア
  cache.clear();
  // HTMLキャッシュをクリア & 再ウォーム
  clearHtmlCache();
  // uploadディレクトリをクリア
  await fs.rm(UPLOAD_PATH, { force: true, recursive: true });

  // Warm HTML cache in background
  void warmHtmlCache();

  return res.status(200).type("application/json").send({});
});
