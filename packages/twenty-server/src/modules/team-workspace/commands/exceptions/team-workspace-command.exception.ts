import { msg } from '@lingui/core/macro';

import { CustomException } from 'src/utils/custom-exception';

export enum TeamWorkspaceCommandExceptionCode {
  INVALID_INPUT = 'INVALID_INPUT',
  WORKSPACE_NOT_ENABLED = 'WORKSPACE_NOT_ENABLED',
  UNSUPPORTED_ACTOR = 'UNSUPPORTED_ACTOR',
  ROLE_NOT_ALLOWED = 'ROLE_NOT_ALLOWED',
  RECORD_NOT_OWNED = 'RECORD_NOT_OWNED',
  TARGET_CONTEXT_INVALID = 'TARGET_CONTEXT_INVALID',
  COMMAND_TIME_INVALID = 'COMMAND_TIME_INVALID',
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  RECORD_NOT_FOUND_OR_FORBIDDEN = 'RECORD_NOT_FOUND_OR_FORBIDDEN',
  EXPECTED_STATE_CONFLICT = 'EXPECTED_STATE_CONFLICT',
  EXPECTED_VERSION_CONFLICT = 'EXPECTED_VERSION_CONFLICT',
  IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT',
  RECEIPT_INTEGRITY_ERROR = 'RECEIPT_INTEGRITY_ERROR',
  SIDE_EFFECT_CONFLICT = 'SIDE_EFFECT_CONFLICT',
  CONCURRENT_MODIFICATION = 'CONCURRENT_MODIFICATION',
}

const USER_FRIENDLY_MESSAGE = {
  [TeamWorkspaceCommandExceptionCode.INVALID_INPUT]: msg`Some required command information is invalid.`,
  [TeamWorkspaceCommandExceptionCode.WORKSPACE_NOT_ENABLED]: msg`Team workspace commands are not enabled for this workspace.`,
  [TeamWorkspaceCommandExceptionCode.UNSUPPORTED_ACTOR]: msg`This account cannot run team workspace commands.`,
  [TeamWorkspaceCommandExceptionCode.ROLE_NOT_ALLOWED]: msg`Your server role cannot run this team workspace command.`,
  [TeamWorkspaceCommandExceptionCode.RECORD_NOT_OWNED]: msg`This record is not assigned to you.`,
  [TeamWorkspaceCommandExceptionCode.TARGET_CONTEXT_INVALID]: msg`The target record is missing required linked client or meeting information.`,
  [TeamWorkspaceCommandExceptionCode.COMMAND_TIME_INVALID]: msg`This action is not valid at the target meeting or recording time.`,
  [TeamWorkspaceCommandExceptionCode.INVALID_TRANSITION]: msg`That state transition is not allowed. Refresh the record and choose an available action.`,
  [TeamWorkspaceCommandExceptionCode.RECORD_NOT_FOUND_OR_FORBIDDEN]: msg`The record is unavailable or you do not have permission to use it.`,
  [TeamWorkspaceCommandExceptionCode.EXPECTED_STATE_CONFLICT]: msg`The record is no longer in the expected state. Refresh it and review the latest changes.`,
  [TeamWorkspaceCommandExceptionCode.EXPECTED_VERSION_CONFLICT]: msg`The record changed after it was loaded. Refresh it and review the latest changes.`,
  [TeamWorkspaceCommandExceptionCode.IDEMPOTENCY_CONFLICT]: msg`This request key was already used for different command data.`,
  [TeamWorkspaceCommandExceptionCode.RECEIPT_INTEGRITY_ERROR]: msg`The saved command receipt could not be verified. No new changes were made.`,
  [TeamWorkspaceCommandExceptionCode.SIDE_EFFECT_CONFLICT]: msg`This record already has a different completion or handoff record.`,
  [TeamWorkspaceCommandExceptionCode.CONCURRENT_MODIFICATION]: msg`The record changed while the command was running. Refresh it before trying again.`,
} as const;

export class TeamWorkspaceCommandException extends CustomException<TeamWorkspaceCommandExceptionCode> {
  constructor(message: string, code: TeamWorkspaceCommandExceptionCode) {
    super(message, code, {
      userFriendlyMessage: USER_FRIENDLY_MESSAGE[code],
    });
  }
}
