import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';

import { WasIntroducedInUpgrade } from 'src/engine/core-modules/upgrade/decorators/was-introduced-in-upgrade.decorator';
import { UserEntity } from 'src/engine/core-modules/user/user.entity';

@Entity({ name: 'workspaceCreationRequest', schema: 'core' })
@WasIntroducedInUpgrade({
  upgradeCommandName:
    '2.33.0_CreateWorkspaceCreationRequestFastInstanceCommand_1788992465889',
})
export class WorkspaceCreationRequestEntity {
  @PrimaryColumn({ type: 'uuid' })
  userId: string;

  @PrimaryColumn({ type: 'uuid' })
  requestId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<UserEntity>;

  @Column({ type: 'varchar', length: 64 })
  payloadHash: string;

  // Retain this receipt after account deletion so a retry cannot recreate it.
  @Column({ type: 'uuid' })
  workspaceId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
