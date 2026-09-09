import { isDefined } from 'twenty-shared/utils';
import { TOKEN_PAIR_LOCAL_STORAGE_KEY } from '@/auth/states/tokenPairState';
import { type AuthTokenPair } from '~/generated-metadata/graphql';
import { isValidAuthTokenPair } from './isValidAuthTokenPair';

export const getTokenPair = (): AuthTokenPair | undefined => {
  const stringTokenPair = sessionStorage.getItem(TOKEN_PAIR_LOCAL_STORAGE_KEY);

  if (!isDefined(stringTokenPair)) {
    return undefined;
  }

  try {
    const parsedTokenPair = JSON.parse(stringTokenPair);

    if (!isValidAuthTokenPair(parsedTokenPair)) {
      sessionStorage.removeItem(TOKEN_PAIR_LOCAL_STORAGE_KEY);
      return undefined;
    }

    return parsedTokenPair;
  } catch {
    sessionStorage.removeItem(TOKEN_PAIR_LOCAL_STORAGE_KEY);
    return undefined;
  }
};
