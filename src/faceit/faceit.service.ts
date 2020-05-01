import { IMatchType } from '@bantr/lib/dist/types';
import { OnQueueCompleted, OnQueueError, OnQueueFailed, Process, Processor } from '@nestjs/bull';
import { HttpService, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as Sentry from '@sentry/node';
import { Job } from 'bull';
import { CsgoMatchDto } from 'src/match/dto/csgoMatch.dto';

import { MatchService } from '../match/match.service';
import { UserRepository } from '../user/user.repository';

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
    /**
     * API key used for authentication with Faceit API
     */
    private faceitApiKey: string;
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
        private readonly httpService: HttpService,
        private readonly config: ConfigService,
        private matchService: MatchService
    ) {
        this.faceitApiKey = config.get('BANTR_FACEIT_API');
    }

    /**
     * Processor for the Faceit queue
     * Gets users who have linked their Faceit profile and checks for new matches
     * Found matches are then added to the matches queue for further processing
     * @param job
     */
    @Process({ name: '__default__' })
    async getMatchesForUsers(): Promise<void> {
        const users = await this.userRepository.getUsersWithFaceIt();
        this.logger.verbose(`Found ${users.length} Faceit users to check for new matches`);
        for (const user of users) {
            const history = await this.getPlayerHistory(user.faceitId);

            this.logger.debug(`Found ${history.data.items.length} matches for user "${user.username}" with FaceIt ID "${user.faceitId}"`);
            for (const match of history.data.items) {
                if (match.status !== 'finished') {
                    // Match has not finished yet, don't parse data
                    return;
                }

                const cleanedData = await this.transformAPIResponseToMatch(match);

                this.matchService.addMatchToQueue(cleanedData);
            }
        }
        return;
    }

    private async transformAPIResponseToMatch(faceitMatch): Promise<CsgoMatchDto> {

        try {
            faceitMatch.demoUrl = await this.getDemo(faceitMatch.match_id);
        } catch (error) {
            this.logger.error(`Error while getting demo url ${faceitMatch.match_id}`);
            throw new Error();
        }

        // TODO: refactor this once we learn more on how match types can be identified
        let matchType: IMatchType;
        let foundMatch = false;

        if (faceitMatch.competition_name === 'CS:GO 5v5' && faceitMatch.competition_type === 'matchmaking') {
            matchType = IMatchType.CSGOFaceIt;
            foundMatch = true;

        }

        // We have to be careful that we do not mislabel matches.
        // Log unknown match types until we implement them
        if (!foundMatch) {
            this.logger.error(`Unknown Faceit match type - ${faceitMatch.competition_name} ${faceitMatch.competition_type}`);
            throw new Error(`Unknown Faceit match type`);
        }

        const data: CsgoMatchDto = {
            id: faceitMatch.match_id,
            externalId: faceitMatch.match_id,
            type: matchType,
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

    /**
     * Get authorization headers
     */
    private getHeaders() {
        return { Authorization: `Bearer ${this.faceitApiKey}` };
    }

    private async doRequest(endpoint: string): Promise<unknown> {
        try {
            const response = await this.httpService.get(`https://open.faceit.com/data/v4${endpoint}`, {
                headers: this.getHeaders(),
                params: {
                    limit: 100
                }
            }).toPromise();
            return response;
        } catch (error) {
            this.logger.error(`createRequest() - Error connecting to Faceit API ${endpoint}`, error.stack);
            throw error;
        }
    }

    private async getMatchDetails(matchId: string) {
        return await this.doRequest(`/matches/${matchId}`);
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
        this.logger.error(`Job ${job.id} of type ${job.name} from queue ${job.queue.name} has failed!`);
        Sentry.captureException(err);
    }

    @OnQueueError()
    onError(err: Error) {
        this.logger.error(`An error occured in a queue!`, err.stack);
        Sentry.captureException(err);
    }
}
