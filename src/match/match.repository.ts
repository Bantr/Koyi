import { EntityRepository, Repository } from 'typeorm';

import Match from './match.entity';

/**
 * Database operations for match
 */
@EntityRepository(Match)
export class MatchRepository extends Repository<Match> {

}
