import { EntityRepository, Repository } from 'typeorm';

import Match from './match.entity';

/**
 * Database operations for match
 */
@EntityRepository(Match)
export class MatchRepository extends Repository<Match> {

    public async createMatch(match: Match) {
        return match.save();
    }

    public async findMatchByExternalId(externalId: string) {
        return await this.findOne({
            where: {
                externalId: externalId
            }
        })
    }

    public async checkIfExists(externalId: string) {
        const matches = await this.find({
            where: { externalId }
        });
        return !!matches.length;
    }

}
