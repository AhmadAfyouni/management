import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { json } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = ["*", "https://task-management-demo-frontend.qnv2oe.easypanel.host"];

  const UPLOADS_DIR = join(process.cwd(), 'uploads');
  // Use express.static correctly
  app.use('/public-files', express.static(UPLOADS_DIR));

  app.enableCors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true })
  );

  app.use(json({ limit: '1mb' }));

  const port = process.env.PORT || 80;
  await app.listen(port, () => {
    console.log(`app running on server : http://localhost:${port}`);
  });
}

bootstrap();
