import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { FileStorageModule } from 'src/engine/core-modules/file-storage/file-storage.module';
import { FileController } from 'src/engine/core-modules/file/controllers/file.controller';
import { FileModule } from 'src/engine/core-modules/file/file.module';
import { FileByIdGuard } from 'src/engine/core-modules/file/guards/file-by-id.guard';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';

// Keep request authentication out of the file services used by the auth graph.
@Module({
  imports: [FileModule, FileStorageModule, JwtModule, TokenModule],
  providers: [FileByIdGuard],
  controllers: [FileController],
})
export class FileHttpModule {}
