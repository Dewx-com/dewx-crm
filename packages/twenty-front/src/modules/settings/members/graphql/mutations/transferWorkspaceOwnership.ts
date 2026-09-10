import { gql } from '@apollo/client';

export const TRANSFER_WORKSPACE_OWNERSHIP = gql`
  mutation TransferWorkspaceOwnership($nextOwnerUserId: UUID!) {
    transferWorkspaceOwnership(nextOwnerUserId: $nextOwnerUserId) {
      id
      primaryOwnerUserId
    }
  }
`;
