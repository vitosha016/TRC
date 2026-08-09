import { Hono } from "hono";
import { serveStatic } from "hono/cloudflare-workers";
import { buffsRoutes } from "./buffs";
import { adminRoutes } from "./admin";

const app = new Hono();

app.route("/api/buffs", buffsRoutes);
app.route("/api/admin", adminRoutes);

app.get("/", serveStatic({ path: "index.html" }));

export default app;
