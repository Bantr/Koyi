import { User } from '@bantr/lib/dist/entities';
import { OnQueueCompleted, OnQueueError, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { HttpService, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as Sentry from '@sentry/node';
import { Job } from 'bull';
import { LastCheckedType, UserRepository } from 'src/user/user.repository';

import IGetPlayerBansResponse from './interface/IGetPlayerBansResponse.interface';

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
  /**
   * The service constructor
   * @param httpService
   * @param configService
   */
  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.steamApiKey = configService.get('BANTR_STEAM_API');
  }

  @Process({ name: '__default__' })
  async getMatchesForUsers(): Promise<void> {
    this.logger.log(`Checking for new Matchmaking matches`);
    const users = await this.userRepository.getUsersSortedByLastChecked(
      LastCheckedType.steam
    );

    console.log(users);

    for (const user of users) {
      const apiResponses = await this.getNewMatchesForUser(user);
      console.log(apiResponses);
    }
  }

  /**
   * Get ban status for an array of steam IDs
   * @param steamIds
   */
  async getUserBans(steamIds: string[]) {
    // TODO: create interface for steamId
    const response = await this.httpService
      .get(`https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/`, {
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
      .get(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/`, {
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
    const response = await this.httpService
      .get(
        `https://api.steampowered.com/ICSGOPlayers_730/GetNextMatchSharingCode/v1?`,
        {
          params: {
            key: this.steamApiKey,
            steamid: user.steamId,
            knowncode: user.settings.lastKnownMatch,
            steamidkey: user.settings.matchAuthCode
          }
        }
      )
      .toPromise();

    // We got all the new matches for user, we can return.
    if (response.status === 202) {
      return matches;
    }

    // Request errored, should not attempt more requests
    if (response.status !== 200) {
      // TODO: Properly handle this depending on what error happens
      this.logger.error(`Failed getting next match for user ${user.id}`);
      Sentry.captureEvent({
        user: { id: user.id.toString() },
        message: `${response.status} - ${JSON.stringify(response.data)}`
      });
      return matches;
    }

    user.settings.lastKnownMatch = response.data.result.nextcode;
    matches.push(response.data.result.nextcode);
    return this.getNewMatchesForUser(user, matches);
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
