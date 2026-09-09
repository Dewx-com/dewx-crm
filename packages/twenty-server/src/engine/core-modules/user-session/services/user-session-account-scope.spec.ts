import { type Request, type Response } from 'express';

import { type AuthTokenPair } from 'src/engine/core-modules/auth/dto/auth-token-pair.dto';
import { type TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserSessionCookieService } from 'src/engine/core-modules/user-session/services/user-session-cookie.service';
import { UserSessionService } from 'src/engine/core-modules/user-session/services/user-session.service';

const accountA = '11111111-1111-4111-8111-111111111111';
const accountB = '22222222-2222-4222-8222-222222222222';

it.each(['same-user', 'different-user'])(
  'keeps account switching scoped when signing in as %s',
  async (identity) => {
    const config = {
      get: (key: string) =>
        (
          ({
            IS_SHARED_DOMAIN_ENABLED: true,
            SERVER_URL: 'https://app.example.com',
            AUTH_COOKIE_SAME_SITE: 'lax',
          }) as Record<string, unknown>
        )[key],
    } as unknown as TwentyConfigService;
    const cookies = new UserSessionCookieService(config);
    const request = {
      headers: {
        'x-workspace-id': accountA,
        cookie: `__Host-twenty-session_${accountA}=sess_a; __Host-twenty-session_${accountB}=sess_b`,
      },
    } as unknown as Request;
    const response = {
      req: request,
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;
    request.res = response;
    const revokeSessionByToken = jest.fn();
    const service: UserSessionService = Object.assign(
      Object.create(UserSessionService.prototype),
      {
        twentyConfigService: config,
        userSessionCookieService: cookies,
        isRequestAllowedToReceiveSessionCookie: () => true,
        buildCreateSessionInputFromTokenPair: () => ({
          userId: 'current-user',
          workspaceId: accountB,
        }),
        resolveSession: async () => ({
          payload: {
            userId: identity === 'same-user' ? 'current-user' : 'old-user',
          },
        }),
        revokeSessionByToken,
        createSession: async () => ({
          sessionToken: 'sess_new_b',
          session: { workspaceId: accountB, expiresAt: new Date('2030-01-01') },
        }),
      },
    );

    await service.issueSessionForTokenPair({
      request,
      tokenPair: {} as AuthTokenPair,
      origin: 'sign_in',
    });

    expect(response.cookie).toHaveBeenCalledWith(
      `__Host-twenty-session_${accountB}`,
      'sess_new_b',
      expect.objectContaining({ httpOnly: true, secure: true }),
    );
    const revoked = revokeSessionByToken.mock.calls.map(([token]) => token);
    expect(revoked).toContain('sess_b');
    if (identity === 'same-user') {
      expect(revoked).not.toContain('sess_a');
      expect(response.clearCookie).not.toHaveBeenCalled();
    } else {
      expect(revoked).toContain('sess_a');
      expect(response.clearCookie).toHaveBeenCalledWith(
        `__Host-twenty-session_${accountA}`,
        expect.anything(),
      );
    }
  },
);

jest.mock('src/engine/core-modules/app-token/app-token.entity', () => ({
  AppTokenEntity: class {},
}));
jest.mock('src/engine/core-modules/user-session/user-session.entity', () => ({
  UserSessionEntity: class {},
}));
jest.mock(
  'src/engine/core-modules/cache-storage/services/cache-storage.service',
  () => ({
    CacheStorageService: class {},
  }),
);
jest.mock(
  'src/engine/core-modules/event-logs/emit/event-log-emitter.service',
  () => ({
    EventLogEmitterService: class {},
  }),
);
jest.mock('src/engine/core-modules/jwt/services/jwt-wrapper.service', () => ({
  JwtWrapperService: class {},
}));
jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({
    TwentyConfigService: class {},
  }),
);
