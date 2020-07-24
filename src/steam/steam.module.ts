import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from 'src/user/user.repository';

import { SteamService } from './steam.service';
import { MatchModule } from 'src/match/match.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRepository]),
    HttpModule,
    MatchModule
  ],
  providers: [SteamService],
  exports: [SteamService]
})
export class SteamModule {}
