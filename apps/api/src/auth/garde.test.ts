import { afterEach, describe, expect, it } from 'vitest';
import { anonymousAllowed, assertAuthConfigured, authEnabled } from './google.js';

/**
 * Le garde-fou d'accès.
 *
 * Sans connexion Google, l'application est OUVERTE : n'importe qui atteint
 * n'importe quel foyer. C'est acceptable en développement, jamais en
 * production. Ces tests figent cette frontière — c'est le genre de règle qu'une
 * refonte ultérieure fait sauter sans que personne ne s'en aperçoive.
 */

const initial = { ...process.env };

afterEach(() => {
  process.env = { ...initial };
});

describe('authEnabled', () => {
  it('suit la présence de l’identifiant Google', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(authEnabled()).toBe(false);

    process.env.GOOGLE_CLIENT_ID = 'client.apps.googleusercontent.com';
    expect(authEnabled()).toBe(true);
  });

  it('ignore un identifiant vide ou fait d’espaces', () => {
    process.env.GOOGLE_CLIENT_ID = '   ';
    expect(authEnabled()).toBe(false);
  });
});

describe('anonymousAllowed', () => {
  it('tolère l’entrée sans compte hors production', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    process.env.NODE_ENV = 'development';
    expect(anonymousAllowed()).toBe(true);
  });

  it('la refuse en production', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.ALLOW_ANONYMOUS;
    process.env.NODE_ENV = 'production';
    expect(anonymousAllowed()).toBe(false);
  });

  it('la tolère en production seulement si on l’a explicitement demandé', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_ANONYMOUS = 'true';
    expect(anonymousAllowed()).toBe(true);
  });

  it('reste faux dès que la connexion Google est configurée', () => {
    process.env.NODE_ENV = 'development';
    process.env.GOOGLE_CLIENT_ID = 'client.apps.googleusercontent.com';
    expect(anonymousAllowed()).toBe(false);
  });
});

describe('assertAuthConfigured', () => {
  it('refuse de démarrer une production sans identifiant Google', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.ALLOW_ANONYMOUS;
    process.env.NODE_ENV = 'production';
    expect(() => assertAuthConfigured()).toThrowError(/GOOGLE_CLIENT_ID/);
  });

  it('laisse passer la production correctement configurée', () => {
    process.env.NODE_ENV = 'production';
    process.env.GOOGLE_CLIENT_ID = 'client.apps.googleusercontent.com';
    expect(() => assertAuthConfigured()).not.toThrow();
  });

  it('laisse passer une démonstration publique explicitement assumée', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_ANONYMOUS = 'true';
    expect(() => assertAuthConfigured()).not.toThrow();
  });

  it('ne bloque jamais le développement', () => {
    delete process.env.GOOGLE_CLIENT_ID;
    process.env.NODE_ENV = 'development';
    expect(() => assertAuthConfigured()).not.toThrow();
  });
});
