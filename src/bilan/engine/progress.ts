// Avancement d'une section : nombre de champs remplis sur le nombre de champs (notes comprises).
import type { FieldDef, SectionDef } from '../content/types';
import type { BilanState } from '../state/bilan';

function isFilled(secId: string, f: FieldDef, s: BilanState): boolean {
  const key = `${secId}.${f.id}`;
  switch (f.kind) {
    case 'number':
      return key in s.nums || `${key}.D` in s.nums || `${key}.G` in s.nums;
    case 'choice':
      return key in s.choices;
    case 'test':
      return key in s.tests;
    case 'chips':
      return f.chips.some((c) => s.chips[`${key}.${c.id}`]);
    case 'notes':
      return (s.notes[key] ?? '').trim() !== '';
  }
}

export function sectionProgress(sec: SectionDef, s: BilanState): { filled: number; total: number } {
  return { filled: sec.fields.filter((f) => isFilled(sec.id, f, s)).length, total: sec.fields.length };
}
