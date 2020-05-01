import { EntityRepository, Repository } from 'typeorm';

import Player from '../player/player.entity';
import Ban from './ban.entity';
import { CreateBanDTO } from './dto/createBan.dto';

/**
 * Database operations for bans
 */
@EntityRepository(Ban)
export class BanRepository extends Repository<Ban> {

    /**
     * Create a new Ban in the database
     * @param data
     */
    async createBan(data: CreateBanDTO): Promise<Ban> {
        const ban = new Ban();

        ban.detectedAt = new Date();
        ban.type = data.type;
        ban.preExisting = data.preExisting;
        ban.player = data.player;

        await ban.save();

        return ban;
    }

    /**
     * Delete a ban from the database
     * @param ban
     */
    async deleteBan(ban: Ban): Promise<Ban> {
        ban.unbanned = true;
        ban.unbannedAt = new Date();
        return await ban.save();
    }

    /**
     * Find bans in the system for a Player
     * @param player
     */
    public async findBansForPlayer(player: Player): Promise<Ban[]> {
        const bans = await this.find({
            where: {
                player
            }
        });
        return bans;
    }

}
