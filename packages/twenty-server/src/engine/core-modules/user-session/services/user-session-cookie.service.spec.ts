import { type Request, type Response } from 'express';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';
import { UserSessionCookieService } from './user-session-cookie.service';

jest.mock(
  'src/engine/core-modules/twenty-config/twenty-config.service',
  () => ({ TwentyConfigService: class {} }),
);

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';
const BASE_COOKIE = '__Host-twenty-session';
const browserCookies = `${BASE_COOKIE}=sess_identity; ${BASE_COOKIE}_${ACCOUNT_A}=sess_account_a; ${BASE_COOKIE}_${ACCOUNT_B}=sess_account_b`;
const request = (workspaceId?: string, cookie = browserCookies) =>
  ({
    headers: {
      cookie,
      ...(workspaceId !== undefined ? { 'x-workspace-id': workspaceId } : {}),
    },
  }) as Request;

describe('shared-domain account cookies', () => {
  const config: Record<string, unknown> = {
    SERVER_URL: 'https://app.example.com',
    AUTH_COOKIE_SAME_SITE: 'lax',
    IS_SHARED_DOMAIN_ENABLED: true,
  };
  const service = new UserSessionCookieService({
    get: (key: string) => config[key],
  } as unknown as TwentyConfigService);

  it('selects each account independently and keeps the identity cookie separate', () => {
    expect(service.extractSessionTokenFromRequest(request(ACCOUNT_A))).toBe(
      'sess_account_a',
    );
    expect(service.extractSessionTokenFromRequest(request(ACCOUNT_B))).toBe(
      'sess_account_b',
    );
    expect(service.extractSessionTokenFromRequest(request())).toBe(
      'sess_identity',
    );
    expect(
      service.extractSessionTokenFromRequest(request(ACCOUNT_A), ACCOUNT_B),
    ).toBe('sess_account_b');
    expect(
      service.extractSessionTokenFromRequest(request(ACCOUNT_A), null),
    ).toBe('sess_identity');
  });

  it('never reuses the identity cookie when issuing an account session, or accepts an insecure cookie', () => {
    expect(
      service.extractSessionTokenFromRequest(request('invalid')),
    ).toBeUndefined();
    expect(
      service.extractSessionTokenFromRequest(
        request(ACCOUNT_A, `${BASE_COOKIE}=sess_identity`),
        ACCOUNT_A,
      ),
    ).toBeUndefined();
    expect(
      service.extractSessionTokenFromRequest(
        request(ACCOUNT_A, `twenty-session_${ACCOUNT_A}=sess_insecure`),
      ),
    ).toBeUndefined();
  });

  it('issues an account cookie with the existing HttpOnly, Secure, host-only protections', () => {
    const response = { req: request(ACCOUNT_A), cookie: jest.fn() };
    const expiresAt = new Date('2030-01-01');
    service.attachSessionTokenToResponse(
      response as unknown as Response,
      'sess_new_b',
      expiresAt,
      ACCOUNT_B,
    );
    expect(response.cookie).toHaveBeenCalledWith(
      `${BASE_COOKIE}_${ACCOUNT_B}`,
      'sess_new_b',
      {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        expires: expiresAt,
      },
    );
  });

  it('clears only the selected account on authentication failure, and all browser sessions on sign-out', () => {
    const response = { req: request(ACCOUNT_A), clearCookie: jest.fn() };
    service.clearSessionCookie(response as unknown as Response);
    expect(response.clearCookie).not.toHaveBeenCalledWith(
      `${BASE_COOKIE}_${ACCOUNT_B}`,
      expect.anything(),
    );
    expect(service.extractBrowserSessionTokens(response.req)).toEqual([
      'sess_identity',
      'sess_account_a',
      'sess_account_b',
    ]);
    service.clearBrowserSessionCookies(response as unknown as Response);
    expect(response.clearCookie).toHaveBeenCalledWith(
      `${BASE_COOKIE}_${ACCOUNT_B}`,
      expect.objectContaining({ httpOnly: true, secure: true, path: '/' }),
    );
  });
});
