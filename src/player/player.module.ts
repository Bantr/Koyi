import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SteamModule } from '../steam/steam.module';
import Player from './player.entity';
import { PlayerRepository } from './player.repository';
import { PlayerService } from './player.service';

@Module({
  imports: [TypeOrmModule.forFeature([Player, PlayerRepository]),
    SteamModule],
  providers: [PlayerService],
  exports: [PlayerService]
})
export class PlayerModule { }
