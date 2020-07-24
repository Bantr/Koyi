import { IBanType } from '@bantr/lib/dist/types';
import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bull';
import Player from 'src/player/player.entity';
import IGetPlayerBansResponse, { EconomyBan } from 'src/steam/interface/IGetPlayerBansResponse.interface';

import { NotificationService } from '../notification/notification.service';
import { PlayerService } from '../player/player.service';
import { QueueService } from '../queue/queue.service';
import { SteamService } from '../steam/steam.service';
import Ban from './ban.entity';
import { BanRepository } from './ban.repository';

/**
 * Detects (un)bans
 */
@Injectable()
@Processor('bans')
export class BanService {
  /**
   * It's the logger, duh :)
   */
  private logger = new Logger('BanService');
  /**
   * Bull Queue for scheduling check for bans
   */
  private bansQueue: Queue;

  /**
   * Injects dependencies
   * @param banRepository
   * @param queueService
   * @param playerService
   * @param steamService
   */
  constructor(
    @InjectRepository(BanRepository)
    private banRepository: BanRepository,
    private queueService: QueueService,
    private playerService: PlayerService,
    private steamService: SteamService,
    private notificationService: NotificationService
  ) {
    this.bansQueue = queueService.getQueue('bans');
  }

  /**
   * Gets players that need to be checked for new bans & then calls processProfile for these
   */
  @Process({ name: '__default__' })
  private async getProfilesForPlayers() {
    const players = await this.playerService.findPlayersToCheckForBans();
    this.logger.debug(`Found ${players.length} players to check for new bans`);
    const steamIds = players.map(t => t.steamId);

    // Get Steam bans
    const banStatuses = await this.steamService.getUserBans(steamIds);

    try {
      await this.playerService.updateSteamProfile(players);
    } catch (error) {
      this.logger.error(error);
    }

    // TODO: Get Faceit profiles
    // Blocked by the fact that Faceit API doesn't return ban status ATM

    for (const player of players) {
      // Handle bans
      const banStatusForUser = banStatuses.find(banStatus => banStatus.SteamId === player.steamId);

      if (banStatusForUser) {
        // Update steam info for these accounts
        // TODO: Separate this into a Bull job so the workload gets spread over all workers
        // Blocked by https://github.com/nestjsx/@nestjs/bull/pull/166
        await this.processProfile(player, banStatusForUser);
      } else {
        return this.logger.warn(`Did not find banStatus for ${JSON.stringify(player)}`);
      }

    }
  }

  /**
   * Returns deltas for each ban type. If a delta > 0 then a new ban is detected, if delta < 0 then a user was unbanned
   * @param player
   * @param banStatus
   */
  private async getBanChanges(player: Player, banStatus: IGetPlayerBansResponse) {
    const existingBans = await this.banRepository.findBansForPlayer(player);
    const hasBan = banStatus.CommunityBanned || banStatus.VACBanned || (banStatus.EconomyBan !== EconomyBan.Banned);
    const existingCommunityBan = existingBans.filter(b => b.type === IBanType.Community).length > 0 ? true : false;
    const existingEconomyBan = existingBans.filter(b => b.type === IBanType.Economy).length > 0 ? true : false;

    const gameBansDelta = banStatus.NumberOfGameBans - existingBans.filter(b => b.type === IBanType.Game).length;
    const vacBansDelta = banStatus.NumberOfVACBans - existingBans.filter(b => b.type === IBanType.VAC).length;
    let communityBansDelta: number;
    let economyBanDelta: number;

    // Calculate changes for community bans
    if (!existingCommunityBan && banStatus.CommunityBanned) {
      communityBansDelta = 1;
    } else if (existingCommunityBan && !banStatus.CommunityBanned) {
      communityBansDelta = -1;
    } else {
      communityBansDelta = 0;
    }

    // Calculate changes for economy bans
    if (!existingEconomyBan && banStatus.EconomyBan === EconomyBan.Banned) {
      economyBanDelta = 1;
    } else if (existingEconomyBan && banStatus.EconomyBan === EconomyBan.NotBanned) {
      economyBanDelta = -1;
    } else {
      economyBanDelta = 0;
    }

    return {
      hasBan,
      existingBans,
      types: {
        steamGameBan: {
          gameBansDelta
        },
        steamVacBan: {
          vacBansDelta
        },
        steamCommunityBan: {
          communityBansDelta
        },
        steamEconomyBan: {
          economyBanDelta
        }
      }
    };
  }

  /**
   * Check profiles for bans and adjust database accordingly
   * @param player
   * @param banStatus
   */
  async processProfile(player: Player, banStatus: IGetPlayerBansResponse) {
    // Did this ban exist before the account was added to the system?
    const preExisting = player.lastCheckedAt.valueOf() < new Date(10000).valueOf();
    const newBans: Ban[] = [];
    const deletedBans: Ban[] = [];
    const { hasBan, existingBans, types } = await this.getBanChanges(player, banStatus);
    // Options used for each create statement, need to add type
    const commonOptions = {
      detectedAt: new Date(),
      player,
      preExisting
    };

    // TODO: refactor this copy pasted mess :)
    // But how? These have subtle but important differences

    if (types.steamVacBan.vacBansDelta > 0) {
      for (let index = 0; index < types.steamVacBan.vacBansDelta; index++) {
        newBans.push(await this.banRepository.createBan({ type: IBanType.VAC, ...commonOptions }));
      }
    } else if (types.steamVacBan.vacBansDelta < 0) {
      for (let index = 0; index < Math.abs(types.steamVacBan.vacBansDelta); index++) {
        const existingBan = existingBans.find(b => b.type === IBanType.VAC);
        await this.banRepository.deleteBan(existingBan);
        deletedBans.push(existingBan);
      }
    }

    if (types.steamGameBan.gameBansDelta > 0) {
      for (let index = 0; index < types.steamGameBan.gameBansDelta; index++) {
        newBans.push(await this.banRepository.createBan({ type: IBanType.Game, ...commonOptions }));
      }
    } else if (types.steamGameBan.gameBansDelta < 0) {
      for (let index = 0; index < Math.abs(types.steamGameBan.gameBansDelta); index++) {
        const existingBan = existingBans.find(b => b.type === IBanType.Game);
        await this.banRepository.deleteBan(existingBan);
        deletedBans.push(existingBan);
      }
    }

    if (types.steamEconomyBan.economyBanDelta > 0) {
      newBans.push(await this.banRepository.createBan({ type: IBanType.Economy, ...commonOptions }));
    } else if (types.steamEconomyBan.economyBanDelta < 0) {
      const existingBan = existingBans.find(b => b.type === IBanType.Economy);
      await this.banRepository.deleteBan(existingBan);
      deletedBans.push(existingBan);
    }

    if (types.steamCommunityBan.communityBansDelta > 0) {
      newBans.push(await this.banRepository.createBan({ type: IBanType.Community, ...commonOptions }));
    } else if (types.steamCommunityBan.communityBansDelta < 0) {
      const existingBan = existingBans.find(b => b.type === IBanType.Community);
      await this.banRepository.deleteBan(existingBan);
      deletedBans.push(existingBan);
    }

    const updatedPlayer = await this.playerService.updateLastCheckedAt(player);

    if (newBans.length) {
      this.notificationService.sendNotification({ player: updatedPlayer, newBans, deletedBans });
    }

    return {
      hasBan,
      newBans,
      player: updatedPlayer
    };
  }
}
