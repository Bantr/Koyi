import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bull';

/**
 * Handles Bull Queues
 */
@Injectable()
export class QueueService {
    /**
     * Map containing the queues
     */
    private queues: Map<string, Queue> = new Map();
    /**
     * The logger
     */
    private logger = new Logger('QueueService');
    /**
     * Inject dependencies
     * @param faceitQueue
     * @param matchesQueue
     */
    constructor(
        @InjectQueue('faceit')
        private readonly faceitQueue: Queue,
        @InjectQueue('matches')
        private readonly matchesQueue: Queue,
        @InjectQueue('bans')
        private readonly bansQueue: Queue,
        @InjectQueue('steam')
        private readonly steamQueue: Queue,
        private readonly configService: ConfigService
    ) {
        // Add repeated job for getting user matches
        faceitQueue.add({}, { repeat: { cron: configService.get('BANTR_FACEIT_MATCH_CRON') } });
        // Add repeated job for getting user matches
        steamQueue.add({}, { repeat: { cron: configService.get('BANTR_STEAM_MATCH_CRON') } });
        // Add repeated job for checking Players for new bans
        bansQueue.add({}, { repeat: { cron: configService.get('BANTR_STEAM_BANS_CRON') } });

        this.queues.set('faceit', faceitQueue);
        this.queues.set('matches', matchesQueue);
        this.queues.set('bans', bansQueue);
        this.queues.set('steam', steamQueue);
    }

    /**
     * Get a Queue instance
     * @param key
     */
    public getQueue(key: string) {
        if (!this.queues.has(key)) {
            this.logger.error(`Tried to get an unknown Queue! Make sure you have initialized the Queue in the QueueModule`);
            throw new NotFoundException();
        }

        return this.queues.get(key);
    }
}
