import path from "node:path";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { corsOrigins, env } from "./shared/env.js";
import { publicRateLimit } from "./shared/middleware/rate-limit.js";
import { errorHandler, notFound } from "./shared/middleware/error-handler.js";
import apiRoutes from "./modules/api.routes.js";
import { buildOpenApiDocument } from "./swagger.js";

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Branch-Id"]
  }));
  app.use(compression());
  app.use(morgan(":method :url :status :response-time ms"));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.resolve(env.UPLOAD_DIR)));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(buildOpenApiDocument()));
  app.use("/api/v1", publicRateLimit, apiRoutes);
  app.get("/health", (_req, res) => res.json({ status: "ok", service: "upbarber-backend" }));
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
