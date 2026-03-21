import bodyParser from "body-parser";
import compression from "compression";
import Express from "express";

import { apiRouter } from "@web-speed-hackathon-2026/server/src/routes/api";
import { staticRouter } from "@web-speed-hackathon-2026/server/src/routes/static";
import { sessionMiddleware } from "@web-speed-hackathon-2026/server/src/session";

export const app = Express();

app.set("trust proxy", true);

app.use(sessionMiddleware);
app.use(bodyParser.json());
app.use(bodyParser.raw({ limit: "10mb" }));

app.use(
  compression({
    filter(req, res) {
      if (req.path === "/api/v1/crok") {
        return false;
      }
      return compression.filter(req, res);
    },
  }),
);

app.use("/api/v1", (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") {
    res.setHeader("Cache-Control", "private, max-age=2, stale-while-revalidate=10");
  } else {
    res.setHeader("Cache-Control", "no-store");
  }
  return next();
});

app.use("/api/v1", apiRouter);
app.use(staticRouter);
