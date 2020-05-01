import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'faceit'
    }),
    BullModule.registerQueue({
      name: 'matches'
    }),
    BullModule.registerQueue({
      name: 'bans'
    })
  ],
  providers: [QueueService],
  exports: [QueueService]
})
export class QueueModule { }
