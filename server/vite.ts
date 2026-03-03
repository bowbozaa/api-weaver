import type { Server } from "http";
import type { Express } from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";

export async function setupVite(httpServer: Server, app: Express) {
  const vite = await createViteServer({
    configFile: path.resolve(process.cwd(), "vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server: httpServer },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const htmlPath = path.resolve(process.cwd(), "client", "index.html");
      let html = fs.readFileSync(htmlPath, "utf-8");
      html = await vite.transformIndexHtml(url, html);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
