import { HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from 'src/user/user.repository';

import { PlayerModule } from '../player/player.module';
import { QueueModule } from '../queue/queue.module';
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
