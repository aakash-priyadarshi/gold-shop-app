import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });
  const logger = new Logger("Bootstrap");

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS — allow main app + team frontend
  app.enableCors({
    origin: [
      process.env.TEAM_FRONTEND_URL || "http://localhost:3002",
      process.env.MAIN_FRONTEND_URL || "http://localhost:3000",
      /\.orivraa\.com$/,
    ],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix("api");

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("Orivraa Team Operations API")
    .setDescription("Employee Management, AI Sales, Certificates, Social, Reviews, Support")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port);
  logger.log(`Team API running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
