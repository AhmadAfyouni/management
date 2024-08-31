import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule) as any;
  await app.listen(3000, () => {
    console.log("app running on server : http://localhost:3000");
  });
}

bootstrap();