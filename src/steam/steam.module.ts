import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from 'src/user/user.repository';

import { SteamService } from './steam.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRepository]),
    HttpModule
  ],
  providers: [SteamService],
  exports: [SteamService]
})
export class SteamModule {
}
