// Exports du bilan : blocs de texte par rubrique SYSmeta (copier-coller) et lignes du PDF.
// L'identité du patient n'apparaît JAMAIS dans les blocs SYSmeta.
import { DISCLAIMER } from '../../data/text';
import { fr } from '../../engine/format';
import type { SummaryLine } from '../../engine/summary';
import type { FieldDef, SectionDef, SysmetaRubric, ZoneDef } from '../content/types';
import type { BilanState, Identity } from '../state/bilan';
import { withinBounds } from './bounds';

export interface SysmetaBlock {
  rubric: SysmetaRubric;
  text: string;
}

const withUnit = (v: number, unit?: string) => fr(v) + (unit ? (unit === '°' ? '°' : ` ${unit}`) : '');

/** Lignes de texte d'un champ rempli (une seule, sauf notes multilignes conservées telles quelles). */
function fieldLine(sec: SectionDef, f: FieldDef, s: BilanState): string | null {
  const key = `${sec.id}.${f.id}`;
  switch (f.kind) {
    case 'number': {
      if (f.sided) {
        const parts = (['D', 'G'] as const)
          .map((side) => {
            const v = s.nums[`${key}.${side}`];
            return v === undefined ? null : `${side} ${withUnit(v, f.unit)}`;
          })
          .filter((x): x is string => x !== null);
        return parts.length ? `${f.label} : ${parts.join(' / ')}` : null;
      }
      const v = s.nums[key];
      return v === undefined ? null : `${f.label} : ${withUnit(v, f.unit)}`;
    }
    case 'choice': {
      const v = s.choices[key];
      if (v === undefined) return null;
      return `${f.label} : ${f.options.find((o) => o.value === v)?.label ?? v}`;
    }
    case 'test': {
      const v = s.tests[key];
      return v === undefined ? null : `${f.label} : ${v === 'pos' ? 'positif' : 'négatif'}`;
    }
    case 'chips': {
      const on = f.chips.filter((c) => s.chips[`${key}.${c.id}`]).map((c) => c.label);
      return on.length ? `${f.label} : ${on.join(', ')}` : null;
    }
    case 'notes': {
      const t = (s.notes[key] ?? '').trim();
      return t || null;
    }
  }
}

const sectionLines = (sec: SectionDef, s: BilanState): string[] =>
  sec.fields.map((f) => fieldLine(sec, f, s)).filter((x): x is string => x !== null);

export function sysmetaBlocks(z: ZoneDef, state: BilanState): SysmetaBlock[] {
  const s = withinBounds(z, state);
  const byRubric = new Map<SysmetaRubric, string[]>();
  for (const sec of z.sections) {
    if (!sec.sysmeta) continue;
    const lines = sectionLines(sec, s);
    if (!lines.length) continue;
    byRubric.set(sec.sysmeta, [...(byRubric.get(sec.sysmeta) ?? []), ...lines]);
  }
  return [...byRubric].map(([rubric, lines]) => ({ rubric, text: lines.join('\n') }));
}

const frDate = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
};

function patientLine(id: Identity): string | null {
  const name = [id.prenom.trim(), id.nom.trim()].filter(Boolean).join(' ');
  const parts = [name, id.naissance ? `né(e) le ${frDate(id.naissance)}` : ''].filter(Boolean);
  return parts.length ? `Patient : ${parts.join(', ')}` : null;
}

export function bilanSummaryLines(z: ZoneDef, state: BilanState, date: Date = new Date()): SummaryLine[] {
  const s = withinBounds(z, state);
  const L: SummaryLine[] = [{ t: 't', s: `Bilan : ${z.label}` }];
  const patient = patientLine(s.identity);
  if (patient) L.push({ t: 'p', s: patient });
  L.push({ t: 'p', s: `Code : ${s.code}` });
  L.push({ t: 'p', s: `Date : ${date.toLocaleDateString('fr-CH')}` });
  let any = false;
  for (const sec of z.sections) {
    const lines = sectionLines(sec, s);
    if (!lines.length) continue;
    any = true;
    L.push({ t: 'h', s: sec.title });
    for (const l of lines) L.push({ t: 'p', s: l });
  }
  if (!any) L.push({ t: 'p', s: 'Aucune donnée saisie (non renseigné).' });
  L.push({ t: 'n', s: DISCLAIMER });
  return L;
}
