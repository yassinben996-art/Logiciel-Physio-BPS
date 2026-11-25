import type { SectionDef, ZoneDef } from '../src/bilan/content/types';
import { validateIntake, validateZone } from '../src/bilan/content/validate';
import { INTAKE } from '../src/bilan/content/intake';
import type { IntakeDef } from '../src/bilan/content/types';

const src = { ref: 'test', added: '2026-11-24' };

const sections: SectionDef[] = [
  {
    id: 'a',
    title: 'A',
    source: src,
    fields: [
      { kind: 'number', id: 'n', label: 'N', min: 0, max: 10, sided: true, source: src },
      { kind: 'test', id: 't', label: 'T', source: src },
      {
        kind: 'chips',
        id: 'c',
        label: 'C',
        source: src,
        chips: [
          { id: 'x', label: 'X', source: src },
          { id: 'rf', label: 'RF', redFlag: true, source: src },
        ],
      },
      { kind: 'notes', id: 'notes', label: 'Notes', source: src },
    ],
  },
];

const ok: ZoneDef = {
  id: 'shoulder',
  label: 'Épaule',
  sections,
  rules: [
    { id: 'r1', when: { key: 'a.t', op: 'positive' }, kind: 'test', target: 'a.t', reason: 'r', source: src },
    {
      id: 'r2',
      when: { key: 'a.c.x', op: 'checked' },
      kind: 'questionnaire',
      target: 'tsk',
      reason: 'r',
      source: src,
    },
    {
      id: 'r3',
      when: { all: [{ key: 'a.n', op: 'gte', value: 3 }] },
      kind: 'redflag',
      target: 'a.c.rf',
      reason: 'r',
      source: src,
    },
  ],
};

const first = sections[0]!;
const dupSection: ZoneDef = { ...ok, sections: [first, first] };
const dupField: ZoneDef = { ...ok, sections: [{ ...first, fields: [...first.fields, first.fields[0]!] }] };
const badKey: ZoneDef = {
  ...ok,
  rules: [
    {
      id: 'r',
      when: { key: 'a.zz', op: 'filled' },
      kind: 'questionnaire',
      target: 'tsk',
      reason: 'r',
      source: src,
    },
  ],
};
const badQ: ZoneDef = {
  ...ok,
  rules: [
    {
      id: 'r',
      when: { key: 'a.t', op: 'filled' },
      kind: 'questionnaire',
      target: 'nope',
      reason: 'r',
      source: src,
    },
  ],
};
const badRf: ZoneDef = {
  ...ok,
  rules: [
    {
      id: 'r',
      when: { key: 'a.t', op: 'filled' },
      kind: 'redflag',
      target: 'a.c.x',
      reason: 'r',
      source: src,
    },
  ],
};
const dxProv: ZoneDef = {
  ...ok,
  sections: [
    {
      ...first,
      fields: [
        {
          kind: 'test',
          id: 't',
          label: 'T',
          dx: { sens: 0.8, source: { ...src, provisional: true } },
          source: src,
        },
      ],
    },
  ],
  rules: [],
};
const badRange: ZoneDef = {
  ...ok,
  sections: [{ ...first, fields: [{ kind: 'number', id: 'n', label: 'N', min: 10, max: 0, source: src }] }],
  rules: [],
};
const badDate: ZoneDef = { ...ok, sections: [{ ...first, source: { ref: 'x', added: '24.11.2026' } }] };

describe('validateZone', () => {
  it('zone valide → aucune erreur', () => expect(validateZone(ok, ['tsk'])).toEqual([]));
  it('id de section en double', () =>
    expect(validateZone(dupSection, [])).toContainEqual(expect.stringContaining('section en double')));
  it('id de champ en double dans une section', () =>
    expect(validateZone(dupField, [])).toContainEqual(expect.stringContaining('champ en double')));
  it('règle vers une clé inconnue', () =>
    expect(validateZone(badKey, [])).toContainEqual(expect.stringContaining('clé inconnue')));
  it('règle questionnaire inconnu', () =>
    expect(validateZone(badQ, ['tsk'])).toContainEqual(expect.stringContaining('questionnaire inconnu')));
  it('règle redflag vers une pastille non redFlag', () =>
    expect(validateZone(badRf, [])).toContainEqual(expect.stringContaining('drapeau')));
  it('dx chiffré avec source provisoire', () =>
    expect(validateZone(dxProv, [])).toContainEqual(expect.stringContaining('source validée')));
  it('number avec min > max', () =>
    expect(validateZone(badRange, [])).toContainEqual(expect.stringContaining('bornes')));
  it('date added invalide', () =>
    expect(validateZone(badDate, [])).toContainEqual(expect.stringContaining('date')));
  it('opérateur incompatible avec le champ', () =>
    expect(
      validateZone(
        {
          ...ok,
          rules: [
            {
              id: 'r',
              when: { key: 'a.n', op: 'positive' },
              kind: 'test',
              target: 'a.t',
              reason: 'r',
              source: src,
            },
          ],
        },
        [],
      ),
    ).toContainEqual(expect.stringContaining('opérateur')));
  it('identifiant contenant un point (casse le schéma de clés)', () => {
    const z: ZoneDef = { ...ok, sections: [{ ...first, id: 'a.b' }], rules: [] };
    expect(validateZone(z, [])).toContainEqual(expect.stringContaining('identifiant invalide'));
    const z2: ZoneDef = { ...ok, rules: [{ ...ok.rules[0]!, id: 'r.1' }] };
    expect(validateZone(z2, [])).toContainEqual(expect.stringContaining('identifiant invalide'));
  });
  it('option de choix à valeur vide', () => {
    const z: ZoneDef = {
      ...ok,
      sections: [
        {
          ...first,
          fields: [
            { kind: 'choice', id: 'c', label: 'C', options: [{ value: '', label: 'vide' }], source: src },
          ],
        },
      ],
      rules: [],
    };
    expect(validateZone(z, [])).toContainEqual(expect.stringContaining('valeur vide'));
  });
});

describe('validateIntake', () => {
  const base: IntakeDef = INTAKE;
  it('crayon du patient inconnu', () =>
    expect(validateIntake({ ...base, patientPen: 'nope' })).toContainEqual(
      expect.stringContaining('crayon'),
    ));
  it('showIf vers une question inconnue', () =>
    expect(
      validateIntake({
        ...base,
        questions: base.questions.map((q) =>
          q.id === 'cote' && q.kind === 'single' ? { ...q, showIf: { id: 'zz', includes: ['x'] } } : q,
        ),
      }),
    ).toContainEqual(expect.stringContaining('showIf')));
  it('crayon en double', () =>
    expect(validateIntake({ ...base, pens: [...base.pens, base.pens[0]!] })).toContainEqual(
      expect.stringContaining('en double'),
    ));
  it('clé accueil sans intake → inconnue', () =>
    expect(
      validateZone(
        { ...ok, rules: [{ ...ok.rules[1]!, when: { key: 'accueil.duree', op: 'eq', value: 'gt3m' } }] },
        ['tsk'],
      ),
    ).toContainEqual(expect.stringContaining('clé inconnue')));
  it('opérateur incompatible avec une question', () =>
    expect(
      validateZone(
        {
          ...ok,
          rules: [{ ...ok.rules[1]!, when: { key: 'accueil.douleur_actuelle', op: 'includes', value: 'x' } }],
        },
        ['tsk'],
        INTAKE,
      ),
    ).toContainEqual(expect.stringContaining('opérateur')));
  it('accueil.chart.regions accepte gte', () =>
    expect(
      validateZone(
        { ...ok, rules: [{ ...ok.rules[1]!, when: { key: 'accueil.chart.regions', op: 'gte', value: 2 } }] },
        ['tsk'],
        INTAKE,
      ),
    ).toEqual([]));
});
