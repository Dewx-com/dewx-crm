import { Module } from '@nestjs/common';

import { TokenModule } from 'src/engine/core-modules/auth/token/token.module';
import { FileStorageModule } from 'src/engine/core-modules/file-storage/file-storage.module';
import { FileController } from 'src/engine/core-modules/file/controllers/file.controller';
import { FileModule } from 'src/engine/core-modules/file/file.module';
import { FileByIdGuard } from 'src/engine/core-modules/file/guards/file-by-id.guard';
import { JwtModule } from 'src/engine/core-modules/jwt/jwt.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from 'src/engine/core-modules/file/entities/file.entity';
import { FileRecordAccessService } from 'src/engine/core-modules/file/services/file-record-access.service';
import { provideWorkspaceScopedRepository } from 'src/engine/twenty-orm/workspace-scoped-repository/provide-workspace-scoped-repository';
import { WorkspaceCacheModule } from 'src/engine/workspace-cache/workspace-cache.module';

// Keep request authentication out of the file services used by the auth graph.
@Module({
  imports: [
    FileModule,
    FileStorageModule,
    JwtModule,
    TokenModule,
    TypeOrmModule.forFeature([FileEntity]),
    WorkspaceCacheModule,
  ],
  providers: [
    FileByIdGuard,
    FileRecordAccessService,
    provideWorkspaceScopedRepository(FileEntity),
  ],
  controllers: [FileController],
})
export class FileHttpModule {}
