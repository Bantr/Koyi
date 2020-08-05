import { OnQueueCompleted, OnQueueError, OnQueueFailed, OnQueueProgress, Process, Processor } from '@nestjs/bull';
import { forwardRef, HttpService, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as Sentry from '@sentry/node';
import { Job, Queue } from 'bull';
import concat = require('concat-stream');
import { Connection } from 'typeorm';
import bz2 = require('unbzip2-stream');
import { promisify } from 'util';
import { unzip } from 'zlib';

import { PlayerService } from '../player/player.service';
import { QueueService } from '../queue/queue.service';
import { UserRepository } from '../user/user.repository';
import Demo from './demo';
import { CsgoMatchDto } from './dto/csgoMatch.dto';
import Match from './match.entity';
import { MatchRepository } from './match.repository';

/**
 * Processor for the "matches" Queue
 */
@Injectable()
@Processor('matches')
export class MatchService {
  /**
   * It's the logger, duh :)
   */
  private logger = new Logger('MatchService');
  /**
   * A bull queue
   */
  private matchesQueue: Queue;
  /**
   * Inject the imported dependencies
   * @param matchRepository
   * @param queueService
   * @param userService
   * @param playerService
   */
  constructor(
    @InjectRepository(MatchRepository)
    private matchRepository: MatchRepository,
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
    private readonly httpService: HttpService,
    private queueService: QueueService,
    @Inject(forwardRef(() => PlayerService))
    private playerService: PlayerService,
    private readonly config: ConfigService,
    private connection: Connection
  ) {
    this.matchesQueue = queueService.getQueue('matches');
  }

  /**
   * Called from other services that check for new matches. Adds the data to the queue to be processed.
   * @param type Type of the match (faceit, matchmaking, ...)
   * @param data
   */

  public async addMatchToQueue(data: CsgoMatchDto) {
    const exists = await this.matchRepository.checkIfExists(data.externalId);

    if (exists) {
      // If the match is already handled, discard the job
      return;
    }

    const match = new Match();
    match.externalId = data.externalId;
    match.demoUrl = data.demoUrl;
    match.typeExtended = data.typeExtended;
    match.date = new Date();
    match.type = data.type;
    await this.matchRepository.createMatch(match);

    this.logger.debug(
      `addMatchToQueue() - Handling a new match of type ${data.type}`
    );

    await this.matchesQueue.add(data);
  }

  /**
   * Transfroms the data gotten from the source into something useable by the system
   * @param job
   */
  @Process({ name: '__default__' })
  async handleMatch(job: Job) {
    const data = job.data as CsgoMatchDto;

    if (!data.demoUrl) {
      // No demo found, so no need to do any demo parsing
      const match = new Match();
      const matchEntity = Object.assign(match, data);
      await matchEntity.save();
      await job.progress(1);
      return;
    }

    const buffer = await this.downloadDemo(data);
    await job.progress(0.25);

    // If buffer is null, the demo was not able to be downloaded and should not be retried
    // Most services don't keep demos indefinitely, this is how we handle expired demos
    if (buffer === null) {
      return {};
    }

    const match = await this.handleDemo(buffer, data);
    await job.progress(0.5);

    // Update steam profile information
    await this.playerService.updateSteamProfile(match.players);

    // Update tracking info
    // TODO: This should not load the entire tracks relation in memory
    const usersInMatch = await this.userRepository.find({
      where: match.players.map(_ => {
        return {
          steamId: _.steamId
        };
      }),
      relations: ['tracks']
    });

    for (const user of usersInMatch) {
      for (const player of match.players) {
        // Only push players into array that are unique
        if (user.tracks.indexOf(player) === -1) {
          user.tracks.push(player);
        }
      }
      await user.save();
    }

    await job.progress(1);

    return {};
  }

  async downloadDemo(match: CsgoMatchDto): Promise<Buffer> {
    // Different sources return the data in different ways
    if (match.demoUrl.endsWith('.dem.gz')) {
      return await this.handleFaceitDemoDownload(match);
    }

    if (match.demoUrl.endsWith('.bz2')) {
      return await this.handleMatchmakingDemoDownload(match);
    }

    throw new Error(
      `Unknown file type, not sure how to handle demo... ${match.demoUrl}`
    );
  }

  private handleMatchmakingDemoDownload(match: CsgoMatchDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.httpService
        .get(match.demoUrl, { responseType: 'stream' })
        .toPromise()
        .then(response => {
          const writer = concat(buffer => {
            resolve(buffer);
          });
          response.data.pipe(bz2()).pipe(writer);
          writer.on('error', reject);
        })

        .catch(e => {
          if (e.message === 'Request failed with status code 404') {
            resolve(null);
          }
          this.logger.error(e);
          reject(e);
        });
    });
  }

  private handleFaceitDemoDownload(match: CsgoMatchDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.httpService
        .get(match.demoUrl, { responseType: 'arraybuffer' })
        .toPromise()
        .then(response => {
          promisify(unzip)(response.data)
            .then(buffer => {
              resolve(buffer as Buffer);
            })
            .catch(e => {
              this.logger.error(e);
              reject(e);
            });
        })
        .catch(e => {
          this.logger.error(e);
          reject(e);
        });
    });
  }

  /**
   * Takes data from a CSGO match, parses it and stores it in the database.
   * @param match
   */
  private async handleDemo(matchBuffer: Buffer, matchData: CsgoMatchDto) {
    const demo = new Demo(matchBuffer);
    const matchRecord = await this.matchRepository.findMatchByExternalId(
      matchData.externalId
    );
    return await demo.handle(matchData, matchRecord);
  }

  @OnQueueProgress()
  onProgress(job: Job, progress: number) {
    this.logger.debug(`Job ${job.id} is ${progress * 100}% ready!`);
  }

  /**
   * Listener for job completion
   * @param job
   */
  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.debug(
      `Completed job ${job.id} of type ${job.name} from queue ${job.queue.name}`
    );
  }
  /**
   * Listener for job failed
   * @param job
   */
  @OnQueueFailed()
  onFailed(job: Job, err: Error) {
    this.logger.error(
      `Job ${job.id} of type ${job.name} from queue ${job.queue.name} has failed!`,
      err.stack
    );
    Sentry.captureException(err);
  }

  /**
   * Listener for queue error
   * @param job
   */
  @OnQueueError()
  onError(err: Error) {
    this.logger.error(`An error occured in a queue!`, err.stack);
    Sentry.captureException(err);
  }
}
