import { type Request } from 'express';
import { type AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { AccessTokenService } from './access-token.service';

const accountA = '11111111-1111-4111-8111-111111111111';
const accountB = '22222222-2222-4222-8222-222222222222';

describe('selected account credential binding', () => {
  it.each(['cookie', 'bearer'])(
    'rejects a %s credential from another account',
    async (kind) => {
      const authenticatedContext = {
        workspace: { id: accountA },
      } as AuthContext;
      const service: AccessTokenService = Object.assign(
        Object.create(AccessTokenService.prototype),
        {
          jwtWrapperService: {
            extractJwtFromRequest: () => () =>
              kind === 'bearer' ? 'jwt' : undefined,
          },
          userSessionCookieService: {
            extractSessionTokenFromRequest: () => 'sess_legacy',
          },
          validateToken: async () => authenticatedContext,
          validateSessionToken: async () => authenticatedContext,
        },
      );
      const request = {
        headers: { 'x-workspace-id': accountB },
      } as unknown as Request;
      await expect(service.validateTokenByRequest(request)).rejects.toThrow(
        'Session does not match the selected account',
      );
      request.headers['x-workspace-id'] = accountA;
      await expect(service.validateTokenByRequest(request)).resolves.toBe(
        authenticatedContext,
      );
    },
  );

  it('does not turn an identity-only session into access to a selected account', async () => {
    const service: AccessTokenService = Object.assign(
      Object.create(AccessTokenService.prototype),
      {
        jwtWrapperService: { extractJwtFromRequest: () => () => undefined },
        userSessionCookieService: {
          extractSessionTokenFromRequest: () => 'sess_identity',
        },
        validateSessionToken: async () => ({}),
      },
    );
    await expect(
      service.validateTokenByRequest({
        headers: { 'x-workspace-id': accountA },
      } as unknown as Request),
    ).rejects.toThrow('Session does not match');
  });
});

jest.mock('src/engine/core-modules/auth/strategies/jwt.auth.strategy', () => ({
  JwtAuthStrategy: class {},
}));

jest.mock('src/engine/core-modules/jwt/services/jwt-wrapper.service', () => ({
  JwtWrapperService: class {},
}));

jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ TwentyConfigService: class {} }),
);

jest.mock(
  'src/engine/core-modules/user-session/services/user-session.service',
  () => ({ UserSessionService: class {} }),
);

jest.mock(
  'src/engine/core-modules/user-session/services/user-session-cookie.service',
  () => ({ UserSessionCookieService: class {} }),
);

jest.mock(
  'src/engine/core-modules/user-workspace/user-workspace.entity',
  () => ({ UserWorkspaceEntity: class {} }),
);

jest.mock('src/engine/core-modules/user/user.entity', () => ({
  UserEntity: class {},
}));

jest.mock('src/engine/core-modules/workspace/workspace.entity', () => ({
  WorkspaceEntity: class {},
}));

jest.mock(
  'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager',
  () => ({ GlobalWorkspaceOrmManager: class {} }),
);
