import fs from "node:fs/promises";

import { Router } from "express";

import { UPLOAD_PATH } from "@web-speed-hackathon-2026/server/src/paths";
import { clearAuthFastCache } from "@web-speed-hackathon-2026/server/src/utils/auth_fast_cache";

import { cache } from "../../cache";
import { initializeSequelize } from "../../sequelize";
import { sessionStore } from "../../session";

export const initializeRouter = Router();

initializeRouter.post("/initialize", async (_req, res) => {
  // DBリセット
  await initializeSequelize();
  // sessionStoreをクリア
  sessionStore.clear();
  // インメモリキャッシュをクリア
  cache.clear();
  // auth の高速キャッシュをクリア
  clearAuthFastCache();
  // uploadディレクトリをクリア
  await fs.rm(UPLOAD_PATH, { force: true, recursive: true });

  return res.status(200).type("application/json").send({});
});
