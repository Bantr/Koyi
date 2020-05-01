import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

import * as fs from 'fs';

dotenv.config();
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  Sentry.init({ dsn: process.env.BANTR_SENTRY_DSN, release: packageJson.version });
  await app.listen(3000);
}
bootstrap();
