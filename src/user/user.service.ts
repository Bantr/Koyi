import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { IPlayerInMatch } from '../match/interface/player.interface';
import { PlayerRepository } from '../player/player.repository';
import User from './user.entity';
import { UserRepository } from './user.repository';

/**
 * User service
 */
@Injectable()
export class UserService {
    /**
     * Inject dependencies
     * @param userRepository
     */
    constructor(
        @InjectRepository(UserRepository)
        private userRepository: UserRepository,
        @InjectRepository(PlayerRepository)
        private playerRepository: PlayerRepository
    ) { }

    /**
     * Find a User based on their Steam or Faceit ID
     * @param player
     */
    public async findUserBySteamOrFaceItId(player: IPlayerInMatch) {
        const response = await this.userRepository.findOne({
            where: [
                {
                    steamId: player.steamId
                },
                {
                    faceitId: player.faceitId
                }]
        });
        return response;
    }

    public async getSettings(user: User) {
        const userRecord = await this.userRepository.getSettings(user);
        return userRecord.settings;
    }
}
