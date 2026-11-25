import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../src/styles/styles.css'), 'utf8');
const VARS = [
  '--bg',
  '--surface',
  '--ink',
  '--muted',
  '--line',
  '--soft',
  '--accent',
  '--accent-ink',
  '--accent-soft',
];

/** Blocs dont le sélecteur se termine par « .bilan-theme {» : clair puis sombre. */
function blocks(): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const re = /([^{}]*\.bilan-theme)\s*\{([^}]*)\}/g;
  for (const m of css.matchAll(re)) {
    const vars: Record<string, string> = {};
    for (const v of m[2]!.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})/g)) vars[v[1]!] = v[2]!;
    if (Object.keys(vars).length) out.push(vars);
  }
  return out;
}

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};

describe('palette du bilan', () => {
  const B = blocks();
  it('deux blocs : clair et sombre, toutes les variables', () => {
    expect(B).toHaveLength(2);
    for (const b of B) expect(Object.keys(b).sort()).toEqual([...VARS].sort());
  });
  it.each([
    ['--ink', '--bg'],
    ['--ink', '--surface'],
    ['--muted', '--surface'],
    ['--accent-ink', '--accent'],
    ['--accent', '--surface'],
  ])('contraste %s sur %s ≥ 4,5', (fg, bg) => {
    for (const b of B) expect(ratio(b[fg]!, b[bg]!)).toBeGreaterThanOrEqual(4.5);
  });
});
