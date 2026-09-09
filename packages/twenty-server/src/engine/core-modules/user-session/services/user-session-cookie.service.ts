import { Injectable } from '@nestjs/common';

import { isNonEmptyString } from '@sniptt/guards';
import { isValidUuid } from 'twenty-shared/utils';

import { type CookieOptions, type Request, type Response } from 'express';

import { USER_SESSION_COOKIE_NAME } from 'src/engine/core-modules/user-session/constants/user-session-cookie-name.constant';
import { USER_SESSION_IMPERSONATOR_COOKIE_NAME } from 'src/engine/core-modules/user-session/constants/user-session-impersonator-cookie-name.constant';
import { USER_SESSION_IMPERSONATOR_SECURE_COOKIE_NAME } from 'src/engine/core-modules/user-session/constants/user-session-impersonator-secure-cookie-name.constant';
import { USER_SESSION_SECURE_COOKIE_NAME } from 'src/engine/core-modules/user-session/constants/user-session-secure-cookie-name.constant';
import { extractUserSessionTokenFromRequestCookie } from 'src/engine/core-modules/user-session/utils/extract-user-session-token-from-request.util';
import { TwentyConfigService } from 'src/engine/core-modules/twenty-config/twenty-config.service';

const isHttpsUrl = (url: string | undefined): boolean => {
  if (!isNonEmptyString(url)) {
    return false;
  }

  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

@Injectable()
export class UserSessionCookieService {
  constructor(private readonly twentyConfigService: TwentyConfigService) {}

  private isSecureDeployment(): boolean {
    const serverUrl = this.twentyConfigService.get('SERVER_URL');
    const sameSite = this.twentyConfigService.get('AUTH_COOKIE_SAME_SITE');

    // SameSite=None is rejected by browsers without Secure, so it forces it.
    return isHttpsUrl(serverUrl) || sameSite === 'none';
  }

  private getAccountSuffix(
    request?: Request,
    workspaceId?: string | null,
  ): string | undefined {
    if (!this.twentyConfigService.get('IS_SHARED_DOMAIN_ENABLED')) return '';
    const selected =
      workspaceId === undefined
        ? request?.headers['x-workspace-id']
        : workspaceId;
    if (selected === undefined || selected === null) return '';
    return typeof selected === 'string' && isValidUuid(selected)
      ? `_${selected}`
      : undefined;
  }

  extractSessionTokenFromRequest(
    request: Request,
    workspaceId?: string | null,
  ): string | undefined {
    const suffix = this.getAccountSuffix(request, workspaceId);
    if (suffix === undefined) return undefined;
    const token = extractUserSessionTokenFromRequestCookie(request, {
      secureCookieName: USER_SESSION_SECURE_COOKIE_NAME + suffix,
      insecureCookieName: USER_SESSION_COOKIE_NAME + suffix,
      allowInsecureCookieName: !this.isSecureDeployment(),
    });
    if (token || !suffix || workspaceId !== undefined) return token;

    // Existing browsers can still hold the pre-migration cookie. The access
    // service must verify its account matches the request before accepting it.
    // Issuing/replacing sessions passes an explicit scope and never falls back.
    return extractUserSessionTokenFromRequestCookie(request, {
      secureCookieName: USER_SESSION_SECURE_COOKIE_NAME,
      insecureCookieName: USER_SESSION_COOKIE_NAME,
      allowInsecureCookieName: !this.isSecureDeployment(),
    });
  }

  // Sign-out clears every account session presented by this browser, including
  // the account-agnostic sign-in cookie. Account switching only replaces its target.
  extractBrowserSessionTokens(request: Request): string[] {
    if (!this.twentyConfigService.get('IS_SHARED_DOMAIN_ENABLED')) {
      const token = this.extractSessionTokenFromRequest(request);
      return token ? [token] : [];
    }
    return [
      ...new Set(
        this.getBrowserCookieNames(request).flatMap((cookieName) => {
          const token = extractUserSessionTokenFromRequestCookie(request, {
            secureCookieName: cookieName,
            insecureCookieName: cookieName,
            allowInsecureCookieName: false,
          });
          return token ? [token] : [];
        }),
      ),
    ];
  }

  private getBrowserCookieNames(request?: Request): string[] {
    const baseName = this.resolveCookieSettings().cookieName;
    return (request?.headers.cookie ?? '')
      .split(';')
      .map((part) => part.split('=')[0].trim())
      .filter(
        (name) =>
          name === baseName ||
          (name.startsWith(`${baseName}_`) &&
            isValidUuid(name.slice(baseName.length + 1))),
      );
  }

  clearBrowserSessionCookies(response: Response): void {
    if (!this.twentyConfigService.get('IS_SHARED_DOMAIN_ENABLED')) {
      this.clearSessionCookie(response);
      return;
    }
    for (const name of this.getBrowserCookieNames(response.req)) {
      response.clearCookie(name, this.resolveCookieOptions());
    }
  }

  extractImpersonatorSessionTokenFromRequest(
    request: Request,
  ): string | undefined {
    return extractUserSessionTokenFromRequestCookie(request, {
      secureCookieName: USER_SESSION_IMPERSONATOR_SECURE_COOKIE_NAME,
      insecureCookieName: USER_SESSION_IMPERSONATOR_COOKIE_NAME,
      allowInsecureCookieName: !this.isSecureDeployment(),
    });
  }

  private resolveCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.isSecureDeployment(),
      sameSite: this.twentyConfigService.get('AUTH_COOKIE_SAME_SITE'),
      path: '/',
    };
  }

  private resolveCookieSettings(): {
    cookieName: string;
    options: CookieOptions;
  } {
    return {
      cookieName: this.isSecureDeployment()
        ? USER_SESSION_SECURE_COOKIE_NAME
        : USER_SESSION_COOKIE_NAME,
      options: this.resolveCookieOptions(),
    };
  }

  attachSessionTokenToResponse(
    response: Response,
    sessionToken: string,
    expiresAt: Date,
    workspaceId?: string | null,
  ): void {
    const { cookieName, options } = this.resolveCookieSettings();
    const suffix = this.getAccountSuffix(response.req, workspaceId);
    if (suffix === undefined) return;

    response.cookie(cookieName + suffix, sessionToken, {
      ...options,
      expires: expiresAt,
    });
  }

  attachImpersonatorSessionTokenToResponse(
    response: Response,
    sessionToken: string,
  ): void {
    response.cookie(
      this.isSecureDeployment()
        ? USER_SESSION_IMPERSONATOR_SECURE_COOKIE_NAME
        : USER_SESSION_IMPERSONATOR_COOKIE_NAME,
      sessionToken,
      this.resolveCookieOptions(),
    );
  }

  clearImpersonatorSessionCookie(response: Response): void {
    const options = this.resolveCookieOptions();

    response.clearCookie(USER_SESSION_IMPERSONATOR_SECURE_COOKIE_NAME, options);
    response.clearCookie(USER_SESSION_IMPERSONATOR_COOKIE_NAME, options);
  }

  hasSessionCookie(request: Request): boolean {
    const cookieHeader = request.headers.cookie;

    if (!isNonEmptyString(cookieHeader)) {
      return false;
    }

    if (this.twentyConfigService.get('IS_SHARED_DOMAIN_ENABLED')) {
      return this.getBrowserCookieNames(request).length > 0;
    }

    return [USER_SESSION_SECURE_COOKIE_NAME, USER_SESSION_COOKIE_NAME].some(
      (cookieName) =>
        cookieHeader
          .split(';')
          .some((cookiePart) => cookiePart.trim().startsWith(`${cookieName}=`)),
    );
  }

  clearSessionCookie(response: Response): void {
    const { options } = this.resolveCookieSettings();

    // Both names, so an instance that switched to https drops the cookie it
    // issued under the old one.
    const suffix = this.getAccountSuffix(response.req);
    if (suffix === undefined) return;
    response.clearCookie(USER_SESSION_SECURE_COOKIE_NAME + suffix, options);
    response.clearCookie(USER_SESSION_COOKIE_NAME + suffix, options);
  }
}
