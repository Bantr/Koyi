import { User } from '@bantr/lib/dist/entities';
import { IMatchType } from '@bantr/lib/dist/types';
import { OnQueueCompleted, OnQueueError, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { HttpService, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as Sentry from '@sentry/node';
import { Job, Queue } from 'bull';

import { CsgoMatchDto } from '../match/dto/csgoMatch.dto';
import { MatchService } from '../match/match.service';
import { QueueService } from '../queue/queue.service';
import { LastCheckedType, UserRepository } from '../user/user.repository';
import { IHubMatches } from './apiResponses/hubMatches.interface';

// TODO create interfaces for response data from Faceit API (Perhaps these API calls belong in @bantr/lib ...)

/**
 * Service for Faceit
 */
@Injectable()
@Processor('faceit')
export class FaceitService {
  /**
   * The logger
   */
  private logger = new Logger('FaceitService');

  private watchedHubIds: string[];
  /**
   * API key used for authentication with Faceit API
   */
  private faceitApiKey: string;
  private faceitQueue: Queue;
  /**
   * Inject dependencies
   * @param userRepository
   * @param httpService
   * @param config
   * @param matchService
   */
  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    private queueService: QueueService,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
    private matchService: MatchService
  ) {
    this.faceitApiKey = config.get('BANTR_FACEIT_API');
    this.watchedHubIds = config.get('BANTR_WATCHED_FACEIT_HUBS').split(',');
    this.faceitQueue = queueService.getQueue('faceit');
  }

  /**
   * Processor for the Faceit queue
   * Gets users who have linked their Faceit profile and checks for new matches
   * Found matches are then added to the matches queue for further processing
   * @param job
   */
  @Process({ name: '__default__' })
  async faceitProcessor(): Promise<void> {
    await this.handleNewMatchesUsers();
    await this.handleHubs();
  }

  @Process({ name: 'faceitUser' })
  async processNewMatchesForFaceitUser(job: Job) {
    const user = job.data as User;
    // If a user has no Faceit profile, we shouldn't try to get new matches for this user
    if (!user.faceitId) {
      return;
    }

    const history = await this.getPlayerHistory(user.faceitId);

    this.logger.debug(
      `Found ${history.data.items.length} matches for user "${user.username}" with FaceIt ID "${user.faceitId}"`
    );
    for (const match of history.data.items) {
      if (match.status !== 'finished') {
        // Match has not finished yet, don't parse data
        continue;
      }

      const cleanedData = await this.transformAPIResponseToMatch(match);

      if (cleanedData) {
        await this.matchService.addMatchToQueue(cleanedData);
      }
    }
  }

  @Process({ name: 'faceitHub' })
  async handleHub(job: Job) {
    const hubId = job.data.hubId;
    this.logger.debug(`Getting matches for hub ${hubId}`);
    const hubMatches = await this.getHubMatches(hubId);
    for (const potentialMatch of hubMatches.items) {
      if (potentialMatch.status === 'FINISHED') {
        const match: CsgoMatchDto = {
          demoUrl: potentialMatch.demo_url[0],
          externalId: potentialMatch.match_id,
          id: potentialMatch.match_id,
          type: IMatchType.Other,
          typeExtended: potentialMatch.competition_name
        };
        this.matchService.addMatchToQueue(match);
      }
    }
  }

  /**
   * Gets new matches for hubs we are tracking
   * and adds these matches to processing queue
   */
  public async handleHubs() {
    for (const hubId of this.watchedHubIds) {
      if (hubId === '') {
        continue;
      }
      await this.faceitQueue.add('faceitHub', { hubId });
    }
  }

  public async handleNewMatchesUsers() {
    const users = await this.userRepository.getUsersSortedByLastChecked(
      LastCheckedType.faceit
    );

    const updatedUsers = await this.handleUserFaceitUpdate(users);

    this.logger.verbose(
      `Found ${updatedUsers.length} Faceit users to check for new matches`
    );
    for (const user of updatedUsers) {
      await this.faceitQueue.add('faceitUser', user);
    }
  }

  /**
   * Handles the process of getting users without faceit info, searching faceit for that info and saving it to the user entity
   * @param users Users to check
   */
  private async handleUserFaceitUpdate(users: User[]) {
    return Promise.all(
      users.map(user => {
        if (!user.faceitId) {
          return this.updateUserFaceit(user);
        }
        return user;
      })
    );
  }

  private async updateUserFaceit(user: User) {
    try {
      const response = await this.getFaceitProfileForSteamId(user.steamId);
      const { player_id: faceitId, nickname } = response.data;
      user.faceitId = faceitId;
      user.faceitName = nickname;
      return await this.userRepository.saveUser(user);
    } catch (e) {
      this.logger.error(`Could not update user faceit profile ${user.id}`, e);
      return user;
    }
  }

  /**
   * Tries to find a Faceit profile based on steam ID
   * @param steamId STEAM64 ID
   */
  private async getFaceitProfileForSteamId(steamId: string): Promise<any> {
    return await this.doRequest(`/players?game=csgo&game_player_id=${steamId}`);
  }

  private async transformAPIResponseToMatch(
    faceitMatch
  ): Promise<CsgoMatchDto> {
    try {
      faceitMatch.demoUrl = await this.getDemo(faceitMatch.match_id);
    } catch (error) {
      this.logger.error(`Error while getting demo url ${faceitMatch.match_id}`);
      throw new Error(error);
    }

    const matchType = this.determineFaceitMatchType(faceitMatch);

    // We have to be careful that we do not mislabel matches.
    // Log unknown match types until we implement them
    if (matchType === IMatchType.Other) {
      this.logger.warn(
        `Unknown Faceit match type - ${faceitMatch.competition_name} - ${faceitMatch.competition_type}`
      );
    }

    const data: CsgoMatchDto = {
      id: faceitMatch.match_id,
      externalId: faceitMatch.match_id,
      type: matchType,
      typeExtended: `${faceitMatch.competition_name} - ${faceitMatch.competition_type}`,
      demoUrl: faceitMatch.demoUrl
    };

    return data;
  }

  /**
   * Get the matches for a player in the last month
   * @param id
   */
  private async getPlayerHistory(id: string) {
    return await this.doRequest(`/players/${id}/history`);
  }

  private determineFaceitMatchType(faceitMatch) {
    let matchType: IMatchType = null;

    if (
      faceitMatch.competition_name === 'CS:GO 5v5' &&
      faceitMatch.competition_type === 'matchmaking'
    ) {
      matchType = IMatchType.CSGOFaceIt;
    }

    if (
      faceitMatch.competition_name === 'CS:GO 5v5 PREMIUM' &&
      faceitMatch.competition_type === 'matchmaking'
    ) {
      matchType = IMatchType.CSGOFaceItPremium;
    }

    if (
      faceitMatch.competition_name === 'Mapcore EU - Community Maps' &&
      faceitMatch.competition_type === 'hub'
    ) {
      matchType = IMatchType.HubMapCoreEU;
    }

    if (
      faceitMatch.competition_name === 'Mapcore NA - Community Maps' &&
      faceitMatch.competition_type === 'hub'
    ) {
      matchType = IMatchType.HubMapCoreNA;
    }

    if (matchType === null) {
      matchType = IMatchType.Other;
    }

    return matchType;
  }

  /**
   * Get authorization headers
   */
  private getHeaders() {
    return { Authorization: `Bearer ${this.faceitApiKey}` };
  }

  private getFaceItApiUrl() {
    return 'https://open.faceit.com/data/v4';
  }

  // TODO: Create a proper interface for this API response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async doRequest(endpoint: string): Promise<any> {
    try {
      const response = await this.httpService
        .get(`${this.getFaceItApiUrl()}${endpoint}`, {
          headers: this.getHeaders(),
          params: {
            limit: 100
          }
        })
        .toPromise();
      return response;
    } catch (error) {
      this.logger.error(
        `createRequest() - Error connecting to Faceit API ${endpoint}`,
        error.stack
      );
      throw error;
    }
  }

  private async getMatchDetails(matchId: string) {
    return await this.doRequest(`/matches/${matchId}`);
  }

  private async getHubMatches(hubId: string, limit = 50): Promise<IHubMatches> {
    const response = await this.doRequest(
      `/hubs/${hubId}/matches?type=past&offset=0&limit=${limit}`
    );
    return response.data;
  }

  private async getDemo(matchId: string): Promise<string> | null {
    const matchDetails = await this.getMatchDetails(matchId);
    if (matchDetails.data) {
      if (matchDetails.data.demo_url) {
        return matchDetails.data.demo_url[0];
      }
    }
    return null;
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
      `Job ${job.id} of type ${job.name} from queue ${job.queue.name} has failed!`
    );
    this.logger.error(err.stack);
    Sentry.captureException(err);
  }

  @OnQueueError()
  onError(err: Error) {
    this.logger.error(`An error occured in a queue!`, err.stack);
    this.logger.error(err.stack);
    Sentry.captureException(err);
  }
}
