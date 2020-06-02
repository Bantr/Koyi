import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlayerModule } from '../player/player.module';
import { QueueModule } from '../queue/queue.module';
import { UserRepository } from '../user/user.repository';
import { MatchRepository } from './match.repository';
import { MatchService } from './match.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([MatchRepository, UserRepository]),
        QueueModule,
        PlayerModule,
        HttpModule
    ],
    providers: [MatchService],
    exports: [MatchService]
})
export class MatchModule { }
