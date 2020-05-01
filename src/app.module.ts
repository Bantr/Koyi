import * as Joi from '@hapi/joi';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BanModule } from './ban/ban.module';
import { FaceitModule } from './faceit/faceit.module';
import { MatchModule } from './match/match.module';
import { NotificationModule } from './notification/notification.module';
import { PlayerModule } from './player/player.module';
import { QueueModule } from './queue/queue.module';
import { SteamModule } from './steam/steam.module';
import { UserSettingsModule } from './user-settings/user-settings.module';
import { UserModule } from './user/user.module';

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.BANTR_PG_HOST,
      port: parseInt(process.env.BANTR_PG_PORT, 10),
      username: process.env.BANTR_PG_USER,
      password: process.env.BANTR_PG_PW,
      database: process.env.BANTR_PG_DB,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false
    }),
    BanModule,
    PlayerModule,
    FaceitModule,
    MatchModule,
    QueueModule,
    UserModule,
    SteamModule,
    PlayerModule,
    NotificationModule,
    UserSettingsModule,
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        BANTR_PG_USER: Joi.string().required(),
        BANTR_PG_PW: Joi.string().required(),
        BANTR_PG_DB: Joi.string().required(),
        BANTR_PG_HOST: Joi.string().default('localhost'),
        BANTR_PG_PORT: Joi.number().default(5432),
        BANTR_FACEIT_API: Joi.string().required(),
        BANTR_STEAM_API: Joi.string().required(),
        BANTR_FACEIT_MATCH_CRON: Joi.string().default('0 */2 * * *'),
        BANTR_STEAM_BANS_CRON: Joi.string().default('0 */2 * * *'),
        BANTR_DISCORD_BOT_TOKEN: Joi.string(),
        BANTR_GLOBAL_NOTIFICATION_DISCORD: Joi.string().default(''),
        BANTR_DEMO_DOWNLOAD_LOCATION: Joi.string().default('tmp/'),
        BANTR_SENTRY_DSN: Joi.string().default('')
      })
    })
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule { }
