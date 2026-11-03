import { describe, expect, it } from 'vitest';
import en from '../../src/i18n/en.json';
import es from '../../src/i18n/es.json';
import pt from '../../src/i18n/pt.json';
import { localePath, locales, useTranslations } from '../../src/i18n';

/** Every leaf path of a dictionary; arrays are leaves (their length is checked separately where it matters). */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix} > ${k}` : k));
}

const reference = keyPaths(pt).sort();

describe.each([
  ['en', en],
  ['es', es],
])('%s dictionary', (_name, dict) => {
  const keys = keyPaths(dict).sort();

  it('has every key that PT has', () => {
    expect(reference.filter((k) => !keys.includes(k))).toEqual([]);
  });

  it('has no key that PT lacks', () => {
    expect(keys.filter((k) => !reference.includes(k))).toEqual([]);
  });

  it('gives every string key a non-empty value', () => {
    const empty = Object.entries(dict).filter(([, v]) => typeof v === 'string' && v.trim() === '');
    expect(empty).toEqual([]);
  });

  it('labels every step and stage of the flow figure', () => {
    expect(dict.flow.steps).toHaveLength(pt.flow.steps.length);
    expect(dict.flow.stages).toHaveLength(pt.flow.stages.length);
  });
});

describe('localePath', () => {
  it('serves PT at the base and the others in their own folder', () => {
    expect(localePath('pt', '/')).toBe('/');
    expect(localePath('en', '/')).toBe('/en/');
    expect(localePath('es', '/')).toBe('/es/');
    expect(localePath('pt', '/my_profile/')).toBe('/my_profile/');
    expect(localePath('en', '/my_profile/')).toBe('/my_profile/en/');
    expect(localePath('es', '/my_profile')).toBe('/my_profile/es/');
  });
});

describe('useTranslations', () => {
  it('reads from the dictionary of the given locale', () => {
    expect(locales.map((l) => useTranslations(l)('nav.contact'))).toEqual(['Contato', 'Contact', 'Contacto']);
  });
});
