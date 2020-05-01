import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PlayerModule } from '../player/player.module';
import { PlayerRepository } from '../player/player.repository';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserRepository, PlayerRepository]),
        PlayerModule
    ],
    providers: [UserService],
    exports: [UserService]
})
export class UserModule { }
