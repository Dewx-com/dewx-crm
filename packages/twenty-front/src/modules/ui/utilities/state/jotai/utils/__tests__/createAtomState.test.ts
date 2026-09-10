import { createStore } from 'jotai';
import { createAtomState } from '@/ui/utilities/state/jotai/utils/createAtomState';

type Stored = { token: string } | null;

const validateInitFn = (payload: NonNullable<Stored>) =>
  typeof payload.token === 'string';

describe('createAtomState validated localStorage', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('hydrates a persisted value that passes validateInitFn', () => {
    localStorage.setItem('validAtom', JSON.stringify({ token: 'abc' }));

    const state = createAtomState<Stored>({
      key: 'validAtom',
      defaultValue: null,
      useLocalStorage: true,
      localStorageOptions: { getOnInit: true },
      validateInitFn,
    });

    expect(createStore().get(state.atom)).toEqual({ token: 'abc' });
  });

  it('falls back to the default when the persisted value fails validateInitFn', () => {
    localStorage.setItem('invalidAtom', JSON.stringify({ nope: true }));

    const state = createAtomState<Stored>({
      key: 'invalidAtom',
      defaultValue: null,
      useLocalStorage: true,
      localStorageOptions: { getOnInit: true },
      validateInitFn,
    });

    expect(createStore().get(state.atom)).toBeNull();
  });
  it('validates tab-local state independently of other tabs', () => {
    localStorage.setItem(
      'tabAccount',
      JSON.stringify({ token: 'other-account' }),
    );
    sessionStorage.setItem('tabAccount', JSON.stringify({ invalid: true }));
    const state = createAtomState<Stored>({
      key: 'tabAccount',
      defaultValue: null,
      useSessionStorage: true,
      validateInitFn,
    });
    expect(createStore().get(state.atom)).toBeNull();
    sessionStorage.setItem(
      'tabAccount',
      JSON.stringify({ token: 'this-account' }),
    );
    const nextState = createAtomState<Stored>({
      key: 'tabAccount',
      defaultValue: null,
      useSessionStorage: true,
      validateInitFn,
    });
    expect(createStore().get(nextState.atom)).toEqual({
      token: 'this-account',
    });
  });
});
