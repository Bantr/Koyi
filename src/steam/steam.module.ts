import { forwardRef, HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MatchModule } from '../match/match.module';
import { UserRepository } from '../user/user.repository';
import { SteamService } from './steam.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRepository]),
    HttpModule,
    forwardRef(() => MatchModule)
  ],
  providers: [SteamService],
  exports: [SteamService]
})
export class SteamModule {}
