import { EntityRepository, Repository } from 'typeorm';

import Player from './player.entity';

/**
 * Database operations for Player
 */
@EntityRepository(Player)
export class PlayerRepository extends Repository<Player> {

    /**
     * Returns an array of Players sorted by lastCheckedAt
     * @param limit
     */
    async findPlayerByLastCheckedAt(limit = 100): Promise<Player[]> {

        if (limit > 500) {
            throw new Error('Max limit of Players requested');
        }

        const response = await this.find({
            order: {
                lastCheckedAt: 'ASC'
            },
            take: limit
        });

        return response;
    }
}
