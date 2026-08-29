import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { pinoHttp } from "pino-http";
import { env } from "@/config/env";
import { logger } from "@/config/logger";
import { swaggerSpec } from "@/docs/swaggerSpec";
import { healthRouter } from "@/routes/health.routes";
import { authRouter } from "@/routes/auth.routes";
import { adminAuthRouter } from "@/routes/adminAuth.routes";
import { adminSessionsRouter } from "@/routes/adminSessions.routes";
import { adminClientsRouter } from "@/routes/adminClients.routes";
import { adminMediaRouter } from "@/routes/adminMedia.routes";
import { adminDownloadsRouter } from "@/routes/adminDownloads.routes";
import { adminDashboardRouter } from "@/routes/adminDashboard.routes";
import { adminNotificationsRouter } from "@/routes/adminNotifications.routes";
import { adminPageContentRouter } from "@/routes/adminPageContent.routes";
import { galleryRouter } from "@/routes/gallery.routes";
import { mediaRouter } from "@/routes/media.routes";
import { downloadRouter } from "@/routes/download.routes";
import { pageContentRouter } from "@/routes/pageContent.routes";
import { publicGalleryRouter } from "@/routes/publicGallery.routes";
import { apiRateLimiter } from "@/middleware/rateLimit";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler";

export function createApp(): Express {
  const app = express();

  // Behind a platform proxy (Railway, Render) every request otherwise appears
  // to come from the proxy's own IP: rate limiters would then throttle all
  // users as one, and `secure` cookies would be dropped because Express reads
  // the connection as plain HTTP. One hop — the platform's load balancer.
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    pinoHttp({
      logger,
      // One line per request. The default serializers dump every header on
      // both sides, which at `info` buries the messages worth reading.
      serializers: {
        req: (req: { method: string; url: string }) => `${req.method} ${req.url}`,
        res: (res: { statusCode: number }) => res.statusCode
      },
      redact: {
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers['set-cookie']"
        ],
        censor: "[redacted]"
      }
    })
  );
  app.use(apiRateLimiter);

  app.get("/docs.json", (_req, res) => {
    res.status(200).json(swaggerSpec);
  });
  app.use(
    "/docs",
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", "'unsafe-inline'"],
          "style-src": ["'self'", "'unsafe-inline'"]
        }
      }
    }),
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
  );

  app.use("/health", healthRouter);
  app.use("/auth", authRouter);
  app.use("/gallery", galleryRouter);
  app.use("/media", mediaRouter);
  app.use("/download", downloadRouter);
  app.use("/pages", pageContentRouter);
  app.use("/public", publicGalleryRouter);
  app.use("/admin/auth", adminAuthRouter);
  app.use("/admin/sessions", adminSessionsRouter);
  app.use("/admin/clients", adminClientsRouter);
  app.use("/admin/media", adminMediaRouter);
  app.use("/admin/downloads", adminDownloadsRouter);
  app.use("/admin/dashboard", adminDashboardRouter);
  app.use("/admin/notifications", adminNotificationsRouter);
  app.use("/admin/pages", adminPageContentRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
