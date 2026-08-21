import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { WasIntroducedInUpgrade } from 'src/engine/core-modules/upgrade/decorators/was-introduced-in-upgrade.decorator';
import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';

// Prospect Engine record scope: one row per (role, object). The role may only see / touch rows of that
// object whose <fieldMetadataId> column equals <value>. Our own table; no Enterprise code involved.
@Entity('roleRecordScope')
@WasIntroducedInUpgrade({
  upgradeCommandName:
    '2.32.0_CreateRoleRecordScopeTableFastInstanceCommand_1787000000000',
})
@Unique('IDX_ROLE_RECORD_SCOPE_ROLE_ID_OBJECT_METADATA_ID_UNIQUE', [
  'roleId',
  'objectMetadataId',
])
@Index('IDX_ROLE_RECORD_SCOPE_WORKSPACE_ID', ['workspaceId'])
export class RoleRecordScopeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, type: 'uuid' })
  workspaceId: string;

  @Column({ nullable: false, type: 'uuid' })
  roleId: string;

  @ManyToOne(() => RoleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Relation<RoleEntity>;

  @Column({ nullable: false, type: 'uuid' })
  objectMetadataId: string;

  @Column({ nullable: false, type: 'uuid' })
  fieldMetadataId: string;

  @Column({ nullable: false, type: 'text' })
  value: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
