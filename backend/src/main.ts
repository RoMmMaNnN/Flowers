import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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

  app.enableCors({
    origin: configService.get<string>("FRONTEND_URL") ?? "http://localhost:3000",
  });

  const port = Number(configService.get<string>("PORT") ?? 3001);
  await app.listen(port);
}

void bootstrap();
