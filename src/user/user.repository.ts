import { Logger } from '@nestjs/common';
import { EntityRepository, Repository } from 'typeorm';

import User from './user.entity';

export enum LastCheckedType {
  steam,
  faceit
}

/**
 * Database operations for User
 */
@EntityRepository(User)
export class UserRepository extends Repository<User> {
  /**
   * The logger, duh :)
   */
  private logger = new Logger('UserRepository');

  async getUsers(): Promise<User[]> {
    const users = await this.find();
    return users;
  }

  async findPlayers(user: User) {
    const response = await this.findOne({
      relations: ['tracks'],
      where: {
        id: user.id
      }
    });

    return response.tracks;
  }

  async saveUser(user: User) {
    return await user.save();
  }

  async getSettings(user: User) {
    return await this.findOne(user.id, { relations: ['settings'] });
  }

  async getUsersSortedByLastChecked(type: LastCheckedType, limit = 100) {
    switch (type) {
      case LastCheckedType.faceit:
        // TODO: Not tested yet ¯\_(ツ)_/¯
        return await this.find({
          order: { lastCheckedAtFaceit: 'ASC' },
          take: limit
        });

      case LastCheckedType.steam:
        return await this.createQueryBuilder('user')
          .leftJoinAndSelect('user.settings', 'settings')
          .where('settings.lastKnownMatch is not null')
          .andWhere('settings.matchAuthCode is not null')
          .orderBy('"user"."lastCheckedAtSteam"')
          .limit(limit)
          .getMany();

      default:
        throw new Error(
          "Tried to filter users by a lastChecked type that doesn't exist"
        );
    }
  }
}
