import { join } from "node:path";
import swaggerJsdoc from "swagger-jsdoc";
import { env } from "@/config/env";

// Resolves to src/routes/*.ts in dev (tsx runs the source directly) and to
// dist/routes/*.js after `tsc` compiles for production — swagger-jsdoc reads
// whichever file extension actually exists next to this compiled module.
// Glob patterns need forward slashes even on Windows.
const routesGlob = join(__dirname, "..", "routes", "*.{ts,js}").split("\\").join("/");

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Photographer Client Gallery Platform API",
      version: "1.0.0",
      description:
        "Backend API for session/media management, client galleries, and downloads."
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: "Local" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    },
    tags: [
      { name: "Admin Auth" },
      { name: "Client Auth" },
      { name: "Admin Sessions" },
      { name: "Admin Clients" },
      { name: "Admin Media" },
      { name: "Admin Downloads" },
      { name: "Admin Dashboard" },
      { name: "Gallery" },
      { name: "Download" }
    ]
  },
  apis: [routesGlob]
});
