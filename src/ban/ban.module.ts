import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationModule } from '../notification/notification.module';
import { PlayerModule } from '../player/player.module';
import { QueueModule } from '../queue/queue.module';
import { SteamModule } from '../steam/steam.module';
import { BanRepository } from './ban.repository';
import { BanService } from './ban.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([BanRepository]),
        QueueModule,
        PlayerModule,
        SteamModule,
        NotificationModule,
    ],
    providers: [BanService],
})
export class BanModule { }

/**
 * General workflow
 *
 * Create repeated queue
 *      Get Players, sort by lastCheckedAt and limit to API limit from Steam (should support at least 250 accounts)
 *      Get Steam & Faceit profiles for these accounts
 *
 * Process profile
 *      Check if Player is banned on steam or Faceit
 *      If bans are found, create Ban entity
 *      Make call to notification service (not implemented yet, but keep in mind this has to happen)
 *      If first time check, only create entity but do not send notification (to prevent already banned players from triggering a notification)
 */
