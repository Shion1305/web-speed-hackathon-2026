import "@web-speed-hackathon-2026/server/src/utils/express_websocket_support";
import { app } from "@web-speed-hackathon-2026/server/src/app";

import { warmHtmlCache } from "./routes/static";
import { initializeSequelize } from "./sequelize";

async function main() {
  await initializeSequelize();

  const server = app.listen(Number(process.env["PORT"] || 3000), "0.0.0.0", () => {
    const address = server.address();
    if (typeof address === "object") {
      console.log(`Listening on ${address?.address}:${address?.port}`);
    }
    // Warm HTML cache after server starts
    void warmHtmlCache();
  });
}

main().catch(console.error);
