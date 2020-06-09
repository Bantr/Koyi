import { OnQueueCompleted, OnQueueError, OnQueueFailed, OnQueueProgress, Process, Processor } from '@nestjs/bull';
import { HttpService, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as Sentry from '@sentry/node';
import { Job, Queue } from 'bull';
import { Connection } from 'typeorm';
import { promisify } from 'util';
import { unzip } from 'zlib';

import { PlayerService } from '../player/player.service';
import { QueueService } from '../queue/queue.service';
import { UserRepository } from '../user/user.repository';
import Demo from './demo';
import { CsgoMatchDto } from './dto/csgoMatch.dto';
import Match from './match.entity';
import { MatchRepository } from './match.repository';

// import Demo from './demo';

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
    match.date = new Date();
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

    const buffer = await this.downloadDemo(data);
    await job.progress(0.25);

    const match = await this.handleDemo(buffer, data);
    await job.progress(0.5);

    // Save match to database
    // TODO: Move this to match repository
    const queryRunner = this.connection.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await match.save();
      await queryRunner.commitTransaction();
    } catch (err) {
      // since we have errors lets rollback the changes we made
      await queryRunner.rollbackTransaction();
      // And throw the error so the job is marked as failed
      throw err;
    } finally {
      // you need to release a queryRunner which was manually instantiated
      await queryRunner.release();
    }

    await job.progress(0.75);

    // Update steam profile information
    await this.playerService.updateSteamProfile(match.players);

    // Update tracking info
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

    return match;
  }

  private async downloadDemo(match: CsgoMatchDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      this.httpService
        .get(match.demoUrl, { responseType: 'arraybuffer' })
        .toPromise()
        .then(async response => {
          const doUnzip = promisify(unzip);

          doUnzip(response.data).then(buffer => {
            resolve(buffer as Buffer);
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
