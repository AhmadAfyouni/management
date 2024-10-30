import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule) as any;
  const allowedOrigins = ['http://192.168.1.18:3000', '*'];
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
  const port = process.env.PORT || 80
  await app.listen(port, () => {
    console.log(`app running on server : http://localhost:${port}`);
  });
}
bootstrap();