import { describe, expect, it } from 'vitest';
import { parseScopeAccountId } from '../lib/scope-account';

const ACCOUNTS = [
  { id: 'acc-1' },
  { id: 'acc-2' },
  { id: 'acc-3' },
];

describe('parseScopeAccountId', () => {
  it('returns "all" when param is null and no default option is provided', () => {
    expect(parseScopeAccountId(null, ACCOUNTS)).toBe('all');
  });

  it('returns the defaultWhenUnset value when param is null and option is "my-money"', () => {
    expect(parseScopeAccountId(null, ACCOUNTS, { defaultWhenUnset: 'my-money' })).toBe('my-money');
  });

  it('returns "all" when param is null and defaultWhenUnset is explicitly "all"', () => {
    expect(parseScopeAccountId(null, ACCOUNTS, { defaultWhenUnset: 'all' })).toBe('all');
  });

  it('returns "all" for the explicit "all" param regardless of accounts', () => {
    expect(parseScopeAccountId('all', ACCOUNTS)).toBe('all');
  });

  it('returns "my-money" for the explicit "my-money" param regardless of accounts', () => {
    expect(parseScopeAccountId('my-money', ACCOUNTS)).toBe('my-money');
  });

  it('returns the account id when it exists in the accounts list', () => {
    expect(parseScopeAccountId('acc-2', ACCOUNTS)).toBe('acc-2');
  });

  it('returns the first account id when it is the only match', () => {
    expect(parseScopeAccountId('acc-1', [{ id: 'acc-1' }])).toBe('acc-1');
  });

  it('returns "all" when the account id is not found in the list', () => {
    expect(parseScopeAccountId('unknown-uuid', ACCOUNTS)).toBe('all');
  });

  it('returns "all" for an empty string param (falsy value)', () => {
    expect(parseScopeAccountId('', ACCOUNTS)).toBe('all');
  });

  it('returns "all" when the accounts list is empty and param is a non-special id', () => {
    expect(parseScopeAccountId('acc-1', [])).toBe('all');
  });
});
