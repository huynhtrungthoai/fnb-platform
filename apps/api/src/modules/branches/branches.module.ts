import { Module } from '@nestjs/common';

import { BranchesController } from './branches.controller.js';
import { BranchesRepository } from './branches.repository.js';
import { BranchesService } from './branches.service.js';

/** Branches and branch settings (CORE-01, CORE-02). */
@Module({
  controllers: [BranchesController],
  providers: [BranchesRepository, BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
