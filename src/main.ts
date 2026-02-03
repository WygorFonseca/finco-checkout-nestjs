import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // RAW apenas no webhook do Stripe (path exato!)
  app.use('/checkout/webhook', express.raw({ type: '*/*' }));

  // JSON para o resto
  app.use(express.json());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
