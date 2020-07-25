import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import * as dotenv from 'dotenv';

import { QueueService } from './queue.service';

dotenv.config();

const redisOptions = {
  host: process.env.BANTR_REDIS_HOST,
  port: parseInt(process.env.BANTR_REDIS_PORT, 10)
};

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'faceit',
      redis: redisOptions
    }),
    BullModule.registerQueue({
      name: 'matches',
      redis: redisOptions
    }),
    BullModule.registerQueue({
      name: 'bans',
      redis: redisOptions
    }),
    BullModule.registerQueue({
      name: 'steam',
      redis: redisOptions
    })
  ],
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule { }
