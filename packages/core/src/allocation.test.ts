import { describe, expect, it } from 'vitest';
import {
  balanceAllocation,
  describeAllocation,
  evenAllocation,
  normalizeAllocation,
  planAllocation,
} from './allocation.js';

const noms = { awa: 'Awa', moussa: 'Moussa' };

describe('planAllocation', () => {
  it('valide le cas du cahier des charges : 9 ampoules, 4 + 2 + 3', () => {
    const plan = planAllocation(9, [
      { memberId: null, quantity: 4 },
      { memberId: 'awa', quantity: 2 },
      { memberId: 'moussa', quantity: 3 },
    ]);

    expect(plan.valid).toBe(true);
    expect(plan.remaining).toBe(0);
    expect(plan.groups).toHaveLength(3);
  });

  it('dit ce qui reste à attribuer', () => {
    const plan = planAllocation(9, [{ memberId: 'awa', quantity: 2 }]);
    expect(plan.valid).toBe(false);
    expect(plan.remaining).toBe(7);
    expect(plan.message).toContain('7');
  });

  it('signale un dépassement', () => {
    const plan = planAllocation(3, [
      { memberId: 'awa', quantity: 2 },
      { memberId: 'moussa', quantity: 4 },
    ]);
    expect(plan.remaining).toBe(-3);
    expect(plan.message).toContain('de trop');
  });
});

describe('normalizeAllocation', () => {
  it('fusionne les doublons et supprime les parts vides', () => {
    const parts = normalizeAllocation([
      { memberId: 'awa', quantity: 1 },
      { memberId: 'awa', quantity: 2 },
      { memberId: 'moussa', quantity: 0 },
    ]);
    expect(parts).toEqual([{ memberId: 'awa', quantity: 3 }]);
  });

  it('place toujours le commun en premier', () => {
    const parts = normalizeAllocation([
      { memberId: 'awa', quantity: 1 },
      { memberId: null, quantity: 2 },
    ]);
    expect(parts[0]!.memberId).toBeNull();
  });
});

describe('balanceAllocation', () => {
  it('verse au pot commun ce que personne n’a pris', () => {
    const parts = balanceAllocation(9, [
      { memberId: 'awa', quantity: 2 },
      { memberId: 'moussa', quantity: 3 },
    ]);
    expect(parts[0]).toEqual({ memberId: null, quantity: 4 });
    expect(planAllocation(9, parts).valid).toBe(true);
  });

  it('ne touche à rien quand le compte est bon', () => {
    const depart = [{ memberId: null, quantity: 5 }];
    expect(balanceAllocation(5, depart)).toEqual(depart);
  });
});

describe('evenAllocation', () => {
  it('partage à parts égales et laisse le reste en commun', () => {
    const parts = evenAllocation(7, ['awa', 'moussa']);
    expect(planAllocation(7, parts).valid).toBe(true);
    expect(parts.find((part) => part.memberId === null)!.quantity).toBe(1);
  });

  it('met tout en commun quand il n’y a personne', () => {
    expect(evenAllocation(4, [])).toEqual([{ memberId: null, quantity: 4 }]);
  });
});

describe('describeAllocation', () => {
  it('écrit la répartition en français', () => {
    const phrase = describeAllocation(
      [
        { memberId: null, quantity: 4 },
        { memberId: 'awa', quantity: 2 },
        { memberId: 'moussa', quantity: 3 },
      ],
      noms,
    );
    expect(phrase).toBe('4 en commun, 2 pour Awa, 3 pour Moussa');
  });
});
