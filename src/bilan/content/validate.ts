// Contrôle d'intégrité du contenu : une erreur d'édition doit faire échouer les tests (CI),
// pas planter l'écran en séance.
import type { ChipDef, Condition, FieldDef, Op, Source, ZoneDef } from './types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Identifiants : lettres, chiffres, _ et - (le point sépare les niveaux des clés "s.f.chip"). */
const ID_RE = /^[A-Za-z0-9_-]+$/;

const OPS: Record<FieldDef['kind'], readonly Op[]> = {
  number: ['eq', 'gte', 'lte', 'filled'],
  choice: ['eq', 'filled'],
  test: ['positive', 'negative', 'filled'],
  chips: ['filled'],
  notes: ['filled'],
};

type Resolved = { type: 'field'; field: FieldDef } | { type: 'chip'; chip: ChipDef };

/** Résout une clé "s.f" ou "s.f.chip" dans la zone. */
export function resolveKey(z: ZoneDef, key: string): Resolved | null {
  const [s, f, c, ...rest] = key.split('.');
  if (!s || !f || rest.length) return null;
  const field = z.sections.find((x) => x.id === s)?.fields.find((x) => x.id === f);
  if (!field) return null;
  if (c === undefined) return { type: 'field', field };
  if (field.kind !== 'chips') return null;
  const chip = field.chips.find((x) => x.id === c);
  return chip ? { type: 'chip', chip } : null;
}

function isValidDate(d: string): boolean {
  if (!DATE_RE.test(d)) return false;
  const t = new Date(d + 'T00:00:00Z');
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

export function validateZone(z: ZoneDef, knownQuestionnaires: readonly string[]): string[] {
  const errs: string[] = [];
  const checkId = (what: string, id: string) => {
    if (!ID_RE.test(id))
      errs.push(`identifiant invalide (${what}) : « ${id} » (lettres, chiffres, _ ou - seulement)`);
  };
  const checkSource = (where: string, s: Source) => {
    if (!s.ref.trim()) errs.push(`${where} : source sans référence`);
    if (!isValidDate(s.added))
      errs.push(`${where} : date d'ajout invalide (« ${s.added} », attendu AAAA-MM-JJ)`);
  };

  const sectionIds = new Set<string>();
  for (const sec of z.sections) {
    if (sectionIds.has(sec.id)) errs.push(`id de section en double : ${sec.id}`);
    sectionIds.add(sec.id);
    checkId('section', sec.id);
    checkSource(`section ${sec.id}`, sec.source);
    const fieldIds = new Set<string>();
    for (const f of sec.fields) {
      const where = `${sec.id}.${f.id}`;
      if (fieldIds.has(f.id)) errs.push(`id de champ en double dans ${sec.id} : ${f.id}`);
      fieldIds.add(f.id);
      checkId('champ', f.id);
      checkSource(where, f.source);
      if (f.kind === 'number' && !(f.min <= f.max))
        errs.push(`${where} : bornes invalides (min ${f.min} > max ${f.max})`);
      if (f.kind === 'test' && f.dx) {
        const { sens, spec, lrPos, lrNeg } = f.dx;
        const hasNumbers = [sens, spec, lrPos, lrNeg].some((v) => v !== undefined);
        checkSource(`${where} (dx)`, f.dx.source);
        if (hasNumbers && f.dx.source.provisional === true)
          errs.push(`${where} : propriété diagnostique chiffrée sans source validée`);
      }
      if (f.kind === 'choice') {
        const vals = new Set<string>();
        for (const o of f.options) {
          if (o.value === '') errs.push(`${where} : option à valeur vide (réservée à « non renseigné »)`);
          if (vals.has(o.value)) errs.push(`${where} : option en double : ${o.value}`);
          vals.add(o.value);
        }
      }
      if (f.kind === 'chips') {
        const chipIds = new Set<string>();
        for (const c of f.chips) {
          if (chipIds.has(c.id)) errs.push(`${where} : pastille en double : ${c.id}`);
          chipIds.add(c.id);
          checkId('pastille', c.id);
          checkSource(`${where}.${c.id}`, c.source);
        }
      }
    }
  }

  const checkCond = (ruleId: string, c: Condition) => {
    if ('all' in c) return c.all.forEach((x) => checkCond(ruleId, x));
    if ('any' in c) return c.any.forEach((x) => checkCond(ruleId, x));
    const r = resolveKey(z, c.key);
    if (!r) return errs.push(`règle ${ruleId} : clé inconnue « ${c.key} »`);
    const allowed: readonly Op[] = r.type === 'chip' ? ['checked'] : OPS[r.field.kind];
    if (!allowed.includes(c.op))
      errs.push(`règle ${ruleId} : opérateur « ${c.op} » incompatible avec « ${c.key} »`);
    if ((c.op === 'gte' || c.op === 'lte') && typeof c.value !== 'number')
      errs.push(`règle ${ruleId} : valeur numérique attendue pour « ${c.op} »`);
    if (c.op === 'eq' && c.value === undefined) errs.push(`règle ${ruleId} : valeur attendue pour « eq »`);
  };

  const ruleIds = new Set<string>();
  for (const rule of z.rules) {
    if (ruleIds.has(rule.id)) errs.push(`id de règle en double : ${rule.id}`);
    ruleIds.add(rule.id);
    checkId('règle', rule.id);
    checkSource(`règle ${rule.id}`, rule.source);
    checkCond(rule.id, rule.when);
    if (rule.kind === 'questionnaire') {
      if (!knownQuestionnaires.includes(rule.target))
        errs.push(`règle ${rule.id} : questionnaire inconnu « ${rule.target} »`);
    } else {
      const t = resolveKey(z, rule.target);
      if (rule.kind === 'test' && !(t?.type === 'field' && t.field.kind === 'test'))
        errs.push(`règle ${rule.id} : la cible « ${rule.target} » n'est pas un test`);
      if (rule.kind === 'redflag' && !(t?.type === 'chip' && t.chip.redFlag === true))
        errs.push(`règle ${rule.id} : la cible « ${rule.target} » n'est pas une pastille drapeau rouge`);
    }
  }
  return errs;
}
