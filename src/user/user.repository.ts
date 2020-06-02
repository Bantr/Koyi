import { Logger } from '@nestjs/common';
import { EntityRepository, Repository } from 'typeorm';

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
}
