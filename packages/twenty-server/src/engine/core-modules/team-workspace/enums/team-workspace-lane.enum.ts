import { registerEnumType } from '@nestjs/graphql';

export enum TeamWorkspaceLane {
  SALES = 'sales',
  OPERATIONS = 'operations',
}

registerEnumType(TeamWorkspaceLane, {
  name: 'TeamWorkspaceLane',
  description: 'The requested Prospect Engine team workspace lane.',
});
