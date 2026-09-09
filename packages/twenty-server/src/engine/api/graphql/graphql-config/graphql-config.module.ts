import { Module } from '@nestjs/common';

import { DirectExecutionModule } from 'src/engine/api/graphql/direct-execution/direct-execution.module';
import { CoreEngineModule } from 'src/engine/core-modules/core-engine.module';
import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';

@Module({
  imports: [CoreEngineModule, DirectExecutionModule, TokenModule],
  providers: [],
  exports: [CoreEngineModule, DirectExecutionModule, TokenModule],
})
export class GraphQLConfigModule {}
