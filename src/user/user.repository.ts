import { Logger } from '@nestjs/common';
import { EntityRepository, IsNull, Not, Repository } from 'typeorm';

import User from './user.entity';

/**
 * Database operations for User
 */
@EntityRepository(User)
export class UserRepository extends Repository<User> {
    /**
     * The logger, duh :)
     */
    private logger = new Logger('UserRepository');

    /**
     * Get users who have linked their Faceit account
     */
    async getUsersWithFaceIt(): Promise<User[]> {
        const users = await this.find({ where: { faceitId: Not(IsNull()) }, select: ['faceitId', 'username'] });
        return users;
    }

    async findPlayers(user: User) {
        const response = await this.findOne(
            {
                relations: ['tracks'],
                where: {
                    id: user.id,
                },
            },
        );

        return response.tracks;
    }

    async getSettings(user: User) {
        return await this.findOne(user.id, { relations: ['settings'] });
    }

}
