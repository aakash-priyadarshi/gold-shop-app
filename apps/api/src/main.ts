// Polyfill crypto for Node.js 18.x compatibility with @nestjs/schedule
import { webcrypto } from "crypto";
if (typeof globalThis.crypto === "undefined") {
  (globalThis as any).crypto = webcrypto;
}

import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import * as dns from "dns";
import helmet from "helmet";
import { AppModule } from "./app.module";

/**
 * Configure IPv4-first DNS resolution for Windows compatibility
 * This helps avoid ENOTFOUND errors on Windows where IPv6 DNS resolution can fail
 *
 * Controlled by PREFER_IPV4 environment variable:
 * - PREFER_IPV4=true: Use IPv4-first DNS resolution (recommended for Windows dev)
 * - PREFER_IPV4=false (default): Use system default DNS resolution
 *
 * This is safe for Linux production as it only affects the order of DNS results,
 * not the availability of IPv6 connections.
 */
function configureNetworking(): void {
  const logger = new Logger("Networking");
  const preferIpv4 = process.env.PREFER_IPV4?.toLowerCase() === "true";

  if (preferIpv4) {
    // Check if dns.setDefaultResultOrder is available (Node.js 16.4+)
    if (typeof dns.setDefaultResultOrder === "function") {
      dns.setDefaultResultOrder("ipv4first");
      logger.log("DNS resolution set to IPv4-first (PREFER_IPV4=true)");
    } else {
      logger.warn(
        "dns.setDefaultResultOrder not available. Set NODE_OPTIONS=--dns-result-order=ipv4first for IPv4-first DNS.",
      );
    }
  } else {
    logger.debug("Using system default DNS resolution (PREFER_IPV4 not set)");
  }
}

async function bootstrap() {
  // Configure networking before creating the app
  configureNetworking();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Increase body parser limit for image uploads (10MB for base64 encoded images)
    bodyParser: true,
  });
  const logger = new Logger("Bootstrap");

  // Trust Railway / Cloudflare reverse proxy — ensures correct req.hostname, req.ip
  app.set("trust proxy", true);

  // ======================
  // Body Parser Configuration
  // ======================
  // Increase limit for JSON payloads (for base64 encoded images)
  app.useBodyParser("json", { limit: "10mb" });
  app.useBodyParser("urlencoded", { limit: "10mb", extended: true });

  // ======================
  // Performance Middleware
  // ======================
  // Gzip/Brotli compression — reduces response sizes by 60-80%
  app.use(compression());

  // ======================
  // Security Middleware
  // ======================

  // Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding for Swagger UI
    }),
  );

  // Host validation middleware - only allow requests from known hosts
  const allowedHosts = [
    "orivraa.com",
    "www.orivraa.com",
    "api.orivraa.com",
    "localhost",
    "127.0.0.1",
    // Railway internal / public domains
    "railway.app",
    "up.railway.app",
    "railway.internal",
  ];

  // In production, enforce host validation
  if (process.env.NODE_ENV === "production") {
    app.use((req: any, res: any, next: any) => {
      const host = req.hostname || req.headers.host?.split(":")[0];

      if (
        !host ||
        !allowedHosts.some(
          (allowed) => host === allowed || host.endsWith(`.${allowed}`),
        )
      ) {
        logger.warn(`Blocked request from unauthorized host: ${host}`);
        return res.status(403).json({
          statusCode: 403,
          message: "Forbidden: Invalid host header",
        });
      }
      next();
    });
  }

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS - allow frontend origins
  const allowedOrigins: string[] = [
    process.env.FRONTEND_URL,
    "https://orivraa.com",
    "https://www.orivraa.com",
    "https://gold-shop-app-web.vercel.app",
    // Only allow localhost in development
    ...(process.env.NODE_ENV !== "production" ? ["http://localhost:3000"] : []),
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Swagger API documentation — disabled in production to avoid information disclosure
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Gold Shop Marketplace API")
      .setDescription(
        "Multi-vendor jewellery marketplace API supporting inventory sales and custom manufacturing",
      )
      .setVersion("1.0")
      .addTag("auth", "Authentication endpoints")
      .addTag("users", "User management")
      .addTag("shops", "Shop management")
      .addTag("inventory", "Inventory items")
      .addTag("rfq", "Request for Quote")
      .addTag("offers", "RFQ Offers")
      .addTag("orders", "Orders")
      .addTag("payments", "Payment processing")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document);
  }

  // Global prefix
  app.setGlobalPrefix("api");

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 Gold Shop API running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
