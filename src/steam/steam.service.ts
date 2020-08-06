import { User } from '@bantr/lib/dist/entities';
import { IMatchType } from '@bantr/lib/dist/types';
import { OnQueueCompleted, OnQueueError, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { HttpService, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as Sentry from '@sentry/node';
import { Job } from 'bull';

import { CsgoMatchDto } from '../match/dto/csgoMatch.dto';
import { MatchService } from '../match/match.service';
import { LastCheckedType, UserRepository } from '../user/user.repository';
import IGetPlayerBansResponse from './interface/IGetPlayerBansResponse.interface';
import SteamBot from './SteamBot';

/**
 * Handles actions to do with Steam
 */
@Injectable()
@Processor('steam')
export class SteamService {
  /**
   * The logger ;)
   */
  private logger: Logger = new Logger('SteamService');
  /**
   * API key used for authentication with Steam API
   */
  private steamApiKey: string;

  SteamBot: SteamBot;

  /**
   * The service constructor
   * @param httpService
   * @param configService
   */
  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly matchService: MatchService
  ) {
    this.steamApiKey = configService.get('BANTR_STEAM_API');

    if (
      configService.get('BANTR_STEAM_BOT_USERNAME') &&
      configService.get('BANTR_STEAM_BOT_PASSWORD')
    ) {
      this.SteamBot = new SteamBot(
        configService.get('BANTR_STEAM_BOT_USERNAME'),
        configService.get('BANTR_STEAM_BOT_PASSWORD')
      );
    }
  }

  @Process({ name: '__default__' })
  async getMatchesForUsers(): Promise<void> {
    if (!this.SteamBot) {
      this.logger.warn(
        'There are no Steam credentials configured, Steam bot is not active and we cannot get new demos from Steam matchmaking'
      );
      return;
    }

    if (!this.SteamBot.ready) {
      this.logger.warn(
        'Steam bot is not ready. Perhaps this instance is not running a steam bot?'
      );
      return;
    }

    this.logger.log(`Checking for new Matchmaking matches`);
    const users = await this.userRepository.getUsersSortedByLastChecked(
      LastCheckedType.steam
    );

    for (const user of users) {
      const apiResponses = await this.getNewMatchesForUser(user);
      user.settings.save();
      for (const shareCode of apiResponses) {
        const match = new CsgoMatchDto();
        match.externalId = shareCode;
        match.type = IMatchType.CSGOMatchMaking;
        match.typeExtended = 'Matchmaking 5v5';
        match.demoUrl = await this.SteamBot.getDemoUrlFromShareCode(shareCode);
        await this.matchService.addMatchToQueue(match);
      }
    }
  }

  private getSteamApiUrl() {
    return 'https://api.steampowered.com';
  }

  /**
   * Get ban status for an array of steam IDs
   * @param steamIds
   */
  async getUserBans(steamIds: string[]) {
    // TODO: create interface for steamId
    const response = await this.httpService
      .get(`${this.getSteamApiUrl()}/ISteamUser/GetPlayerBans/v1/`, {
        params: {
          key: this.steamApiKey,
          steamids: steamIds.join(',')
        }
      })
      .toPromise();
    const data: IGetPlayerBansResponse[] = response.data.players;
    return data;
  }

  /**
   * Get ban status for an array of steam IDs
   * @param steamIds
   */
  async getUserProfiles(steamIds: string[]) {
    // TODO: create interface for steamId
    const response = await this.httpService
      .get(`${this.getSteamApiUrl()}/ISteamUser/GetPlayerSummaries/v2/`, {
        params: {
          key: this.steamApiKey,
          steamids: steamIds.join(',')
        }
      })
      .toPromise();
    return response.data.response.players;
  }

  async getNewMatchesForUser(
    user: User,
    matches: Array<string> = []
  ): Promise<Array<string>> {
    this.logger.debug(
      `Getting matches for users ${user.id} - Found ${matches.length} already, last known match: ${user.settings.lastKnownMatch}`
    );
    return this.httpService
      .get(
        `${this.getSteamApiUrl()}/ICSGOPlayers_730/GetNextMatchSharingCode/v1?`,
        {
          params: {
            key: this.steamApiKey,
            steamid: user.steamId,
            knowncode: user.settings.lastKnownMatch,
            steamidkey: user.settings.matchAuthCode
          }
        }
      )
      .toPromise()
      .then(response => {
        // We got all the new matches for user, we can return.
        if (response.status === 202) {
          return matches;
        }

        user.settings.lastKnownMatch = response.data.result.nextcode;
        matches.push(response.data.result.nextcode);
        return this.getNewMatchesForUser(user, matches);
      })
      .catch(error => {
        // Steam rejected the request, something is wrong with the connection settings set by the user
        if (error.response.status === 412 || error.response.status === 403) {
          user.settings.matchmakingAuthFailed = true;
          return [];
        }

        this.logger.error(`Failed getting next match for user ${user.id}`);
        Sentry.captureEvent({
          user: { id: user.id.toString() },
          message: `${error.response.status} - ${JSON.stringify(
            error.response.data
          )}`
        });
        return matches;
      });
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.debug(
      `Completed job ${job.id} of type ${job.name} from queue ${job.queue.name}`
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id} of type ${job.name} from queue ${job.queue.name} has failed!`,
      err.stack
    );
    Sentry.captureException(err);
  }

  @OnQueueError()
  onError(err: Error) {
    this.logger.error(`An error occured in a queue!`, err.stack);
    Sentry.captureException(err);
  }
}
