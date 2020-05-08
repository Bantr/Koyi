import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as Sentry from '@sentry/node';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

import { AppModule } from './app.module';

dotenv.config();
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  Sentry.init({ dsn: process.env.BANTR_SENTRY_DSN, release: packageJson.version });
  await app.listen(6596);
}
bootstrap();
