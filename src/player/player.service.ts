import { Injectable, Logger, forwardRef, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { SteamService } from '../steam/steam.service';
import Player from './player.entity';
import { PlayerRepository } from './player.repository';

/**
 * Service for Player
 */
@Injectable()
export class PlayerService {
  /**
   * The logger
   */
  private logger = new Logger('PlayerService');

  /**
   * Inject dependencies
   * @param playerRepository
   */
  constructor(
    @InjectRepository(PlayerRepository)
    private playerRepository: PlayerRepository,
    @Inject(forwardRef(() => SteamService))
    private readonly steamService: SteamService
  ) {}

  /**
   * Calls the repository to find players
   */
  async findPlayersToCheckForBans(): Promise<Player[]> {
    const players = await this.playerRepository.findPlayerByLastCheckedAt(100);
    return players;
  }

  /**
   * Updates the lastCheckedAt field to now
   * @param player
   */
  public async updateLastCheckedAt(player: Player) {
    player.lastCheckedAt = new Date();
    return await player.save();
  }

  public async updateSteamProfile(players: Player[]) {
    const steamIds = players.map(t => t.steamId);
    // Get Steam profiles
    const steamProfiles = await this.steamService.getUserProfiles(steamIds);

    for (const player of players) {
      const steamProfile = steamProfiles.find(
        _ => _.steamid === player.steamId
      );

      if (steamProfile) {
        player.steamAvatar = steamProfile.avatarfull;
        player.steamProfile = steamProfile.profileurl;
        player.steamUsername = steamProfile.personaname;
        await player.save();
      }
    }
  }
}
