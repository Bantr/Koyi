import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SteamModule } from '../steam/steam.module';
import { NotificationRepository } from './notification.repository';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        TypeOrmModule.forFeature([NotificationRepository]),
        SteamModule,
    ],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule { }
