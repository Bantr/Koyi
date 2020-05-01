import { IMatchType } from '@bantr/lib/dist/types';
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
import Demo from './demo';
import { CsgoMatchDto } from './dto/csgoMatch.dto';
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

    const exists = await this.checkIfExists(data.type, data.externalId);

    if (exists) {
      // If the ban is already handled, discard the job
      return;
    }

    this.logger.debug(`addMatchToQueue() - Handling a new match of type ${data.type}`);

    await this.matchesQueue.add(data);
  }

  /**
   * Transfroms the data gotten from the source into something useable by the system
   * @param job
   */
  @Process({ name: '__default__' })
  async handleMatch(job: Job) {
    const data = job.data as CsgoMatchDto;

    const exists = await this.checkIfExists(data.type, data.externalId);

    if (exists) {
      // If the ban is already handled, discard the job
      return;
    }

    await job.progress(0.25);

    const buffer = await this.downloadDemo(data);

    await job.progress(0.50);

    const match = await this.handleDemo(buffer, data);

    await job.progress(0.75);

    await this.playerService.updateSteamProfile(match.players);

    await job.progress(1);

    return match;
  }

  private async downloadDemo(match: CsgoMatchDto): Promise<Buffer> {
    return new Promise((resolve, reject) => {

      this.httpService.get(match.demoUrl, { responseType: 'arraybuffer' }).toPromise().then(async response => {

        const doUnzip = promisify(unzip);

        doUnzip(response.data).then(buffer => {
          resolve(buffer as Buffer);
        })
      }).catch(e => {
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
    const demo = new Demo(matchBuffer, this.connection);
    return await demo.handle(matchData);
  }

  async checkIfExists(type: IMatchType, externalId: string): Promise<boolean> {
    const matches = await this.matchRepository.find({ where: { type, externalId } });
    return !!matches.length;
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
    this.logger.error(`Job ${job.id} of type ${job.name} from queue ${job.queue.name} has failed!`);
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
