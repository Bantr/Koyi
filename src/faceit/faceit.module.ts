import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MatchModule } from '../match/match.module';
import { UserRepository } from '../user/user.repository';
import { FaceitService } from './faceit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserRepository]),
    HttpModule,
    MatchModule
  ],
  providers: [FaceitService],
  exports: [FaceitService]
})
export class FaceitModule { }
