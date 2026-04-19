import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Use process.cwd() to get the working directory where the app is running
  // This ensures we find the dist/public directory relative to the project root
  const distPath = path.join(process.cwd(), "dist", "public");
  const indexPath = path.join(distPath, "index.html");
  
  console.log(`[serveStatic] process.cwd(): ${process.cwd()}`);
  console.log(`[serveStatic] distPath: ${distPath}`);
  console.log(`[serveStatic] indexPath: ${indexPath}`);
  console.log(`[serveStatic] distPath exists: ${fs.existsSync(distPath)}`);
  console.log(`[serveStatic] indexPath exists: ${fs.existsSync(indexPath)}`);
  
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
    app.use("*", (_req, res) => {
      res.status(404).send("Build directory not found. Please run 'pnpm build' first.");
    });
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  app.use("*", (_req, res) => {
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("index.html not found in build directory");
    }
  });
}
