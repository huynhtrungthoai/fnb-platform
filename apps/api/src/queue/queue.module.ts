import { Global, Module } from '@nestjs/common';

import { QueueService } from './queue.service.js';

/** Background jobs (BullMQ, D-25), available to every module. */
@Global()
@Module({
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
