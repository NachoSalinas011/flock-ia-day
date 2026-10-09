import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  // the web app reaches the API through Vite's proxy; browsers on other origins are not allowed
  app.enableCors({
    origin: (process.env.WEB_ORIGIN ?? 'http://localhost:5173').split(','),
  });
  // pasted text sources can be up to 200k characters
  app.useBodyParser('json', { limit: '1mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Estimador de propuestas')
    .setVersion('0.1')
    .build();
  SwaggerModule.setup('api/docs', app, () =>
    SwaggerModule.createDocument(app, config),
  );

  const port = Number(process.env.API_PORT ?? 3000);
  // local only by default: nobody else on the network can use the API (or its LLM quota)
  const host = process.env.API_HOST ?? '127.0.0.1';
  await app.listen(port, host);
  new Logger('Bootstrap').log(`API escuchando en http://${host}:${port}/api`);
}
void bootstrap();
