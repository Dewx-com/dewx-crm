import { Module } from '@nestjs/common';

import { TypeORMModule } from 'src/database/typeorm/typeorm.module';
import { CoreEntityCacheModule } from 'src/engine/core-entity-cache/core-entity-cache.module';
import { CustomerAccountOwnershipService } from 'src/engine/core-modules/workspace/ownership/customer-account-ownership.service';

@Module({
  imports: [TypeORMModule, CoreEntityCacheModule],
  providers: [CustomerAccountOwnershipService],
  exports: [CustomerAccountOwnershipService],
})
export class CustomerAccountOwnershipModule {}
