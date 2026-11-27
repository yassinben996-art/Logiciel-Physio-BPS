// Exports du bilan : blocs de texte par rubrique SYSmeta (copier-coller) et lignes du PDF.
// L'identité du patient n'apparaît JAMAIS dans les blocs SYSmeta.
import { DISCLAIMER } from '../../data/text';
import { fr } from '../../engine/format';
import type { PdfLine } from '../../pdf/exportPdf';
import { INTAKE } from '../content/intake';
import { intakeLines } from './intakeText';
import type { FieldDef, SectionDef, SysmetaRubric, ZoneDef } from '../content/types';
import type { BilanState, Identity } from '../state/bilan';
import { withinBounds } from './bounds';
import { evolutionRows } from './evolution';
import { frDay, zurichDay } from './followup';
import { QUESTIONNAIRES } from '../../questionnaires/public';
import { scoreQ } from '../../questionnaires/scoring';

export interface SysmetaBlock {
  rubric: SysmetaRubric;
  text: string;
}

export const withUnit = (v: number, unit?: string) => fr(v) + (unit ? (unit === '°' ? '°' : ` ${unit}`) : '');

/** Lignes de texte d'un champ rempli (une seule, sauf notes multilignes conservées telles quelles). */
export function fieldLine(sec: SectionDef, f: FieldDef, s: BilanState): string | null {
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

export const sectionLines = (sec: SectionDef, s: BilanState): string[] =>
  sec.fields.map((f) => fieldLine(sec, f, s)).filter((x): x is string => x !== null);

/** Questionnaires remplis par le patient à domicile : « QuickDASH : 50 / 100 », avec sous-scores et mentions. */
export function questionnaireLines(s: BilanState): string[] {
  return QUESTIONNAIRES.filter((q) => q.id in (s.qResults ?? {})).map((q) => {
    const r = scoreQ(q, s.qResults[q.id]!.answers);
    if (!r) return `${q.name} : aucune réponse`;
    const extra = [r.parts?.join(', '), !r.valid ? (r.note ?? 'non valable') : r.note].filter(Boolean);
    return `${q.name} : ${r.display}${extra.length ? ` (${extra.join(' ; ')})` : ''}`;
  });
}

export function sysmetaBlocks(z: ZoneDef, state: BilanState): SysmetaBlock[] {
  const s = withinBounds(z, state);
  const byRubric = new Map<SysmetaRubric, string[]>();
  // L'accueil ouvre le bloc « Anamnèse ».
  const intake = [...intakeLines(INTAKE, s), ...questionnaireLines(s)];
  if (intake.length) byRubric.set('Anamnèse', intake);
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

export function bilanSummaryLines(
  z: ZoneDef,
  state: BilanState,
  date: Date = new Date(),
  /** Bilans du patient (colonnes de l'évolution), du plus ancien au plus récent. */
  series: readonly BilanState[] = [],
): PdfLine[] {
  const s = withinBounds(z, state);
  const L: PdfLine[] = [{ t: 't', s: `Bilan : ${z.label}` }];
  const patient = patientLine(s.identity);
  if (patient) L.push({ t: 'p', s: patient });
  L.push({ t: 'p', s: `Code : ${s.code}` });
  L.push({ t: 'p', s: `Date : ${date.toLocaleDateString('fr-CH')}` });
  let any = false;
  const intake = intakeLines(INTAKE, s);
  if (intake.length) {
    any = true;
    L.push({ t: 'h', s: 'Accueil' });
    for (const l of intake) L.push({ t: 'p', s: l });
    if (s.intake.strokes.length) L.push({ t: 'chart', strokes: s.intake.strokes, pens: INTAKE.pens });
  }
  for (const sec of z.sections) {
    const lines = sectionLines(sec, s);
    if (!lines.length) continue;
    any = true;
    L.push({ t: 'h', s: sec.title });
    for (const l of lines) L.push({ t: 'p', s: l });
  }
  const ql = questionnaireLines(s);
  if (ql.length) {
    any = true;
    L.push({ t: 'h', s: 'Questionnaires' });
    for (const l of ql) L.push({ t: 'p', s: l });
  }
  if (series.length > 1) {
    const rows = evolutionRows(z, series);
    if (rows.length) {
      any = true;
      L.push({ t: 'h', s: 'Évolution' });
      L.push({ t: 'p', s: `Bilans : ${series.map((b) => frDay(zurichDay(b.createdAt))).join(' → ')}` });
      for (const r of rows)
        L.push({
          t: 'p',
          s: `${r.label} : ${r.values.map((v) => v ?? '–').join(' → ')}${r.delta ? ` (${r.delta})` : ''}`,
        });
    }
  }
  if (!any) L.push({ t: 'p', s: 'Aucune donnée saisie (non renseigné).' });
  L.push({ t: 'n', s: DISCLAIMER });
  return L;
}
