import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { CustomOrigin } from "@nestjs/common/interfaces/external/cors-options.interface";
import { AppModule } from "./app.module";
import { AuthService } from "./auth/auth.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const allowedOrigins = [
    configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000",
    ...(configService.get<string>("FRONTEND_URLS")?.split(",") ?? []),
  ]
    .map((origin) => origin?.trim().replace(/\/$/, ""))
    .filter((origin): origin is string => Boolean(origin));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Sweet Bouquets API")
    .setDescription("Product management API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api", app, document);

  const corsOrigin: CustomOrigin = (requestOrigin, callback) => {
    if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
      callback(null, requestOrigin ?? false);
      return;
    }
    callback(new Error("Origin is not allowed by CORS"), false);
  };

  app.enableCors({
    origin: corsOrigin,
  });

  await app.init();
  await app.get(AuthService).ensureInitialAdmin();

  const port = Number(configService.get<string>("PORT") ?? 3001);
  await app.listen(port);
}

void bootstrap();
