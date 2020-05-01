import { Repository, EntityRepository } from 'typeorm';
import { Logger } from '@nestjs/common';
import Match from './match.entity';

/**
 * Database operations for match
 */
@EntityRepository(Match)
export class MatchRepository extends Repository<Match> {

}
