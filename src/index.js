import { Hono } from "hono";
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { rateLimiterMiddleware } from "./middleware/rateLimiter";
import { Context } from "hono";

import { router } from "./routes/users";
import { payments } from "./routes/payments";
import { webhooks } from "./routes/webhooks";
import { getUploads } from "./routes/upload";
import { reviews } from "./routes/reviews";

const app = new Hono();

app.use("*", async (c, next) => {
  cors({
    origin: c.env.SITE_URL,
    allowHeaders: [
      "Content-Type",
      "X-Custom-Header",
      "Upgrade-Insecure-Requests",
      "Access-Control-Allow-Origin",
    ],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
    maxAge: 600,
    credentials: true,
  });
  console.log(c.env.SITE_URL);
  await next();
});

app.use(logger());
app.use("*", async (c, next) => {
  csrf({ origin: c.env.SITE_URL });
  await next();
});
app.use(rateLimiterMiddleware);
app.route("/payments", webhooks);
app.route("/users", router);
app.route("/payments", payments);
app.route("/upload", getUploads);
app.route("/reviews", reviews);

export default app;
