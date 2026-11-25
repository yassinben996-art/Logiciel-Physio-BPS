import {
  DETAILS,
  REGIONS,
  SILHOUETTE,
  VIEW_H,
  VIEW_W,
  pointInPolygon,
  regionsOf,
  type Stroke,
} from '../src/bilan/bodychart/geometry';

const center = (poly: readonly number[]) => {
  let x = 0;
  let y = 0;
  for (let i = 0; i < poly.length; i += 2) {
    x += poly[i]!;
    y += poly[i + 1]!;
  }
  return [x / (poly.length / 2), y / (poly.length / 2)] as const;
};
const byLabel = (l: string) => REGIONS.find((r) => r.label === l)!;
const through = (l: string, pen = 'douleur'): Stroke => {
  const r = byLabel(l);
  const [x, y] = center(r.poly);
  return { pen, view: r.view, by: 'physio', pts: [x, y, x + 0.5, y + 0.5] };
};

describe('géométrie du body chart', () => {
  it('repère', () => expect([VIEW_W, VIEW_H]).toEqual([200, 420]));
  it('pointInPolygon', () => {
    expect(pointInPolygon(5, 5, [0, 0, 10, 0, 10, 10, 0, 10])).toBe(true);
    expect(pointInPolygon(15, 5, [0, 0, 10, 0, 10, 10, 0, 10])).toBe(false);
  });
  it('ids uniques, vue cohérente avec le libellé', () => {
    expect(new Set(REGIONS.map((r) => r.id)).size).toBe(REGIONS.length);
    for (const r of REGIONS) expect(r.label.endsWith(r.view === 'front' ? '(face)' : '(dos)')).toBe(true);
  });
  it('côtés : droite du patient à gauche de l’image de face, à droite de dos', () => {
    expect(center(byLabel('épaule droite (face)').poly)[0]).toBeLessThan(100);
    expect(center(byLabel('épaule droite (dos)').poly)[0]).toBeGreaterThan(100);
    expect(center(byLabel('main gauche (face)').poly)[0]).toBeGreaterThan(100);
  });
  it('régions attendues', () => {
    for (const l of [
      'tête (face)',
      'cou (dos)',
      'thorax (face)',
      'haut du dos (dos)',
      'bas du dos (dos)',
      'abdomen (face)',
      'bras droit (face)',
      'coude gauche (dos)',
      'avant-bras droit (face)',
      'hanche droite (face)',
      'fesse gauche (dos)',
      'cuisse droite (dos)',
      'genou gauche (face)',
      'jambe droite (face)',
      'pied gauche (dos)',
    ])
      expect(REGIONS.map((r) => r.label)).toContain(l);
  });
  it('aucun chevauchement entre régions d’une même vue', () => {
    for (const view of ['front', 'back'] as const) {
      const rs = REGIONS.filter((r) => r.view === view);
      for (let x = 0.37; x < VIEW_W; x += 2)
        for (let y = 0.37; y < VIEW_H; y += 2) {
          const n = rs.filter((r) => pointInPolygon(x, y, r.poly)).length;
          if (n > 1) throw new Error(`chevauchement en ${x},${y} (${view})`);
        }
    }
  });
  it('silhouette : un seul contour lisse, symétrique', () => {
    expect(SILHOUETTE).toHaveLength(1);
    const o = SILHOUETTE[0]!;
    expect(o.length / 2).toBeGreaterThan(300);
    // symétrie : chaque point a son miroir (à 0,2 près)
    const pts = new Set<string>();
    for (let i = 0; i < o.length; i += 2) pts.add(`${Math.round(o[i]! * 5)},${Math.round(o[i + 1]! * 5)}`);
    let mirrored = 0;
    for (let i = 0; i < o.length; i += 2)
      if (pts.has(`${Math.round((200 - o[i]!) * 5)},${Math.round(o[i + 1]! * 5)}`)) mirrored++;
    expect(mirrored / (o.length / 2)).toBeGreaterThan(0.95);
  });
  it('chaque région recouvre une partie du corps', () => {
    const o = SILHOUETTE[0]!;
    for (const r of REGIONS) {
      let hit = false;
      for (let x = 0.37; x < VIEW_W && !hit; x += 2)
        for (let y = 0.37; y < VIEW_H && !hit; y += 2)
          hit = pointInPolygon(x, y, r.poly) && pointInPolygon(x, y, o);
      if (!hit) throw new Error(`région hors du corps : ${r.label}`);
    }
  });
  it('repères anatomiques propres à chaque vue', () => {
    expect(DETAILS.front.length).toBeGreaterThan(0);
    expect(DETAILS.back.length).toBeGreaterThan(0);
  });
  it('regionsOf', () => {
    expect(regionsOf([through('épaule droite (face)')]).map((r) => r.label)).toEqual([
      'épaule droite (face)',
    ]);
    expect(regionsOf([{ pen: 'douleur', view: 'front', by: 'patient', pts: [1, 1, 2, 2] }])).toEqual([]);
    expect(regionsOf([through('bras droit (dos)'), through('bras droit (dos)')])).toHaveLength(1);
    expect(
      regionsOf([through('bras droit (dos)'), through('cou (face)', 'fourmillements')], 'fourmillements').map(
        (r) => r.label,
      ),
    ).toEqual(['cou (face)']);
  });
});
