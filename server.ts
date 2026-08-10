import { serve } from "@hono/node-server";
import app from "./src/api/index";

// Переопределяем serveStatic для Node.js
const { Hono } = await import("hono");
const { serveStatic } = await import("@hono/node-server/serve-static");

const nodeApp = new Hono();

// Оборачиваем исходное приложение, заменяя cloudflare serveStatic на nodejs
// Просто монтируем всё
nodeApp.route("/api", app.route("/api"));

nodeApp.get("/", (c) => c.html(await Bun?.file("public/index.html").text() ?? ""));

// Читаем index.html и отдаём его
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, "public", "index.html"), "utf-8");

nodeApp.get("/", (c) => c.html(html));

serve({ fetch: nodeApp.fetch, port: 8787 }, (info) => {
  console.log(`http://localhost:${info.port}`);
});
