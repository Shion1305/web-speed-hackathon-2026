import { Router } from "express";
import bcrypt from "bcrypt";
import httpErrors from "http-errors";
import { UniqueConstraintError, ValidationError } from "sequelize";

import { User } from "@web-speed-hackathon-2026/server/src/models";
import {
  cacheCredential,
  ensureAuthFastCacheWarm,
  getCachedCredentialByUsername,
  isKnownUsername,
} from "@web-speed-hackathon-2026/server/src/utils/auth_fast_cache";

import { cache, TTL } from "../../cache";

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  try {
    const username = typeof req.body?.username === "string" ? req.body.username : "";
    await ensureAuthFastCacheWarm();
    if (username !== "" && isKnownUsername(username)) {
      return res.status(400).type("application/json").send({ code: "USERNAME_TAKEN" });
    }

    const createdUser = await User.create(req.body);
    const userId = createdUser.id;

    const passwordHash = createdUser.getDataValue("password");
    if (typeof passwordHash === "string" && createdUser.username !== "") {
      cacheCredential({
        id: createdUser.id,
        passwordHash,
        username: createdUser.username,
      });
    }

    const user = await User.findByPk(userId);

    if (user !== null) {
      cache.set(`user:id:${userId}`, user, TTL.USER);
    }

    req.session.userId = userId;
    return res.status(200).type("application/json").send(user);
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      return res.status(400).type("application/json").send({ code: "USERNAME_TAKEN" });
    }
    if (err instanceof ValidationError) {
      return res.status(400).type("application/json").send({ code: "INVALID_USERNAME" });
    }
    throw err;
  }
});

authRouter.post("/signin", async (req, res) => {
  const username = typeof req.body?.username === "string" ? req.body.username : "";
  const inputPassword = typeof req.body?.password === "string" ? req.body.password : "";
  await ensureAuthFastCacheWarm();

  let credential = getCachedCredentialByUsername(username);
  if (credential === undefined) {
    // Fetch only id+password (unscoped to skip unnecessary profileImage JOIN)
    const userForAuth = await User.unscoped().findOne({
      attributes: ["id", "password", "username"],
      where: { username },
    });
    if (userForAuth === null) {
      throw new httpErrors.BadRequest();
    }

    const passwordHash = userForAuth.getDataValue("password");
    if (typeof passwordHash !== "string") {
      throw new httpErrors.BadRequest();
    }

    credential = {
      id: userForAuth.id,
      passwordHash,
      username: userForAuth.username,
    };
    cacheCredential(credential);
  }

  if (!(await bcrypt.compare(inputPassword, credential.passwordHash))) {
    throw new httpErrors.BadRequest();
  }

  req.session.userId = credential.id;

  const userCacheKey = `user:id:${credential.id}`;
  let user = cache.get<User>(userCacheKey);
  if (user === undefined) {
    user = (await User.findByPk(credential.id)) ?? undefined;
  }
  if (user === undefined) {
    throw new httpErrors.BadRequest();
  }
  cache.set(userCacheKey, user, TTL.USER);
  return res.status(200).type("application/json").send(user);
});

authRouter.post("/signout", async (req, res) => {
  if (req.session.userId !== undefined) {
    cache.delete(`user:id:${req.session.userId}`);
  }
  req.session.userId = undefined;
  return res.status(200).type("application/json").send({});
});
