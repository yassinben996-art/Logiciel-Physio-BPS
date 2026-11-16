// Moteur pur : aucune dépendance à React ni au DOM.
// Règles portées à l'identique depuis analyze() de reference/prototype.html.
// Les seuils d'allumage sont des CHOIX DE CONCEPTION (voir DECISIONS.md), sauf CSI et painDETECT.
import { D2, D4, D4B, D5B, D6 } from '../data/items';
import { REGION } from '../data/regions';
import type { Analysis, CaseState, DomainId, DomainResult, SliderId } from './types';

export const CSI_CUT = { csi9: 20, csi25: 40 } as const;
export const PD_AMBIGUOUS = 13;
export const PD_PROBABLE = 19;

/** Valeur numérique ou null (champ vide / non saisi). */
export const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
};

export function labelMap(s: CaseState): Record<string, string> {
  const R = REGION[s.region];
  const L: Record<string, string> = {};
  [...R.d1, ...R.d3, ...D2, ...D4, D4B, ...D5B, ...D6].forEach((it) => (L[it.id] = it.label));
  return L;
}

export function analyze(s: CaseState): Analysis {
  const R = REGION[s.region];
  const c = s.chk;
  const LBL = labelMap(s);
  const on = (k: string) => !!c[k];
  const startRisk = s.start === 'medium' || s.start === 'high';
  const v = (k: SliderId) => num(s.sl[k]);

  /* 1 — Nociceptif */
  const mk = R.d1.filter((i) => i.kind === 'mk' && on(i.id)).map((i) => i.id);
  const dp = on('a_dp');
  const noimp = on('a_noimp');
  const lit1 = mk.length > 0 || dp || noimp;
  const d1: DomainResult = {
    level: lit1 ? 2 : 0,
    sub: lit1 ? (noimp ? 'A+B' : 'A') : '',
    reasons: [...mk, ...(dp ? ['a_dp'] : []), ...(noimp ? ['a_noimp'] : [])].map((i) => LBL[i] ?? i),
    score: mk.length + (dp ? 2 : 0),
    refer: noimp
      ? [
          'Pas d’amélioration malgré une prise en charge conduite : réévaluer le diagnostic et demander un avis médical.',
        ]
      : [],
  };

  /* 2 — Nociplastique */
  const cut = CSI_CUT[s.csiType];
  const csi = num(s.csi);
  const csiPos = csi !== null && csi >= cut;
  const reg = on('n_reg');
  const disp = on('n_disp');
  const all = on('n_all');
  const sens = on('n_sens');
  const gt3 = s.duration === 'gt3m';
  const possible = gt3 && reg && disp;
  const probable = possible && all;
  const nSigns = Number(reg) + Number(disp) + Number(all);
  let l2: 0 | 1 | 2 = 0;
  if (probable || (csiPos && (reg || disp || all))) l2 = 2;
  else if (csiPos || possible || nSigns + Number(sens) >= 2) l2 = 1;
  const dist = v('dist');
  const distHigh = dist !== null && dist >= 7;
  const nco = D4.filter((i) => on(i.id)).length;
  const r2: string[] = [];
  if (gt3 && (reg || disp || all || csiPos)) r2.push('Durée de plus de 3 mois');
  D2.forEach((i) => {
    if (on(i.id)) r2.push(i.label);
  });
  const csiName = s.csiType === 'csi9' ? '9' : '25';
  if (csi !== null)
    r2.push(`CSI-${csiName} = ${csi} (seuil retenu : ${cut})` + (csiPos ? '' : ', sous le seuil'));
  const d2: DomainResult = {
    level: l2,
    sub: l2 ? (l2 === 2 && (s.start === 'high' || distHigh || nco >= 3) ? 'A+B' : 'A') : '',
    reasons: r2,
    score: nSigns + (sens ? 1 : 0) + (csiPos ? 2 : 0),
    refer: [],
    note: probable
      ? 'Profil proche de « nociplastique probable » (critères IASP 2021, à confirmer avec la grille officielle).'
      : possible
        ? 'Profil proche de « nociplastique possible » : durée, distribution régionale et douleur non expliquée par la seule lésion.'
        : '',
  };
  if (d2.sub === 'A+B')
    d2.refer.push(
      'Persistance malgré 6 à 8 semaines, détresse élevée ou STarT MSK élevé : envisager un programme interdisciplinaire (exercice et approche cognitivo-comportementale).',
    );

  /* 3 — Neuropathique */
  const pd = num(s.pd);
  const pdHigh = pd !== null && pd >= PD_PROBABLE;
  const pdAmb = pd !== null && pd >= PD_AMBIGUOUS && pd < PD_PROBABLE;
  const rad = on('r_rad');
  const def = on('r_def');
  const B3 = on('r_B');
  const burn = on('r_burn');
  const tests = R.d3.filter((i) => i.kind === 'test' && on(i.id)).length;
  let l3: 0 | 1 | 2 = 0;
  if (def || pdHigh || (rad && tests >= 2) || B3) l3 = 2;
  else if (pdAmb || rad || tests >= 1 || burn) l3 = 1;
  const r3 = R.d3.filter((i) => on(i.id)).map((i) => i.label);
  if (pd !== null)
    r3.push(
      `painDETECT = ${pd} (${pdHigh ? 'neuropathique probable, ≥ 19' : pdAmb ? 'ambigu, 13 à 18' : 'neuropathique improbable, < 13'})`,
    );
  const d3: DomainResult = {
    level: l3,
    sub: l3 ? (B3 ? 'B' : def ? 'A+B' : 'A') : '',
    reasons: r3,
    score: (def ? 3 : 0) + (rad ? 1 : 0) + tests + (pdHigh ? 2 : pdAmb ? 1 : 0) + (B3 ? 5 : 0),
    refer: [],
  };
  if (B3)
    d3.refer.push(
      s.region === 'cervical'
        ? 'Signes de myélopathie ou déficit qui progresse : avis médical rapide (imagerie, spécialiste).'
        : 'Déficit neurologique qui progresse : avis médical rapide.',
    );
  else if (def)
    d3.refer.push(
      'Déficit objectif : réévaluer à chaque séance et demander un avis médical s’il persiste ou s’aggrave.',
    );

  /* 4 — Comorbidités */
  const co = D4.filter((i) => on(i.id)).map((i) => i.label);
  const unc = on(D4B.id);
  const d4: DomainResult = {
    level: co.length ? 2 : 0,
    sub: co.length ? (unc ? 'A+B' : 'A') : '',
    reasons: [...co, ...(unc ? [D4B.label] : [])],
    score: co.length + (unc ? 2 : 0),
    refer: unc
      ? [
          'Comorbidité mal contrôlée : avis du médecin traitant avant d’intensifier la charge ou les infiltrations.',
        ]
      : [],
  };

  /* 5 — Cognitivo-affectif */
  const flg: [SliderId, string][] = [];
  const exp = v('exp');
  const eff = v('eff');
  const fear = v('fear');
  const worry = v('worry');
  const struct = v('struct');
  if (exp !== null && exp <= 4) flg.push(['exp', `Attentes de récupération faibles (${exp}/10)`]);
  if (eff !== null && eff <= 4) flg.push(['eff', `Auto-efficacité faible (${eff}/10)`]);
  if (fear !== null && fear >= 6) flg.push(['fear', `Peur du mouvement élevée (${fear}/10)`]);
  if (worry !== null && worry >= 6) flg.push(['worry', `Inquiétude élevée (${worry}/10)`]);
  if (struct !== null && struct >= 6)
    flg.push(['struct', `Croyance structurelle forte : région abîmée ou fragile (${struct}/10)`]);
  if (dist !== null && dist >= 6) flg.push(['dist', `Détresse émotionnelle élevée (${dist}/10)`]);
  const key = flg.filter((f) => f[0] === 'exp' || f[0] === 'eff').length;
  const beh = D5B.filter((i) => on(i.id));
  const nb = beh.length;
  const nf = flg.length;
  let l5: 0 | 1 | 2 = 0;
  if (s.region === 'shoulder') {
    if (key >= 1 || nb >= 2) l5 = 2;
    else if (nf >= 1 || nb >= 1) l5 = 1;
  } else {
    if (nf >= 2 || (nf >= 1 && (startRisk || nb >= 1))) l5 = 2;
    else if (nf === 1 || nb >= 1) l5 = 1;
  }
  const d5: DomainResult = {
    level: l5,
    sub: l5 ? (nf >= 1 && nb >= 1 ? 'A+B' : nb >= 1 ? 'B' : 'A') : '',
    reasons: [
      ...flg.map((f) => f[1]),
      ...beh.map((i) => i.label),
      ...(startRisk ? [`STarT MSK : risque ${s.start === 'high' ? 'élevé' : 'moyen'}`] : []),
    ],
    score: nf + nb + (startRisk ? 1 : 0),
    refer: [],
    note:
      s.region === 'shoulder'
        ? 'Épaule traitée en conservateur : les attentes de récupération et l’auto-efficacité sont les facteurs qui ressortent ; le reste a une valeur prédictive incertaine.'
        : '',
  };
  if ((dist !== null && dist >= 8) || on('co_mood'))
    d5.refer.push('Détresse marquée ou dépression : avis du médecin traitant, psychologue si besoin.');

  /* 6 — Environnement */
  const ea = D6.filter((i) => i.sub === 'A' && on(i.id));
  const eb = D6.filter((i) => i.sub === 'B' && on(i.id));
  let l6: 0 | 1 | 2 = 0;
  if (ea.length + eb.length >= 2 || eb.length >= 1) l6 = 2;
  else if (ea.length === 1) l6 = 1;
  const d6: DomainResult = {
    level: l6,
    sub: l6 ? (eb.length ? (ea.length ? 'A+B' : 'B') : 'A') : '',
    reasons: [...ea, ...eb].map((i) => i.label),
    score: ea.length + 2 * eb.length,
    refer: eb.length
      ? [
          'Litige, arrêts prolongés ou besoins sociaux : médecin du travail, case manager ou assistant social selon la situation.',
        ]
      : [],
  };

  const A: Record<DomainId, DomainResult> = { 1: d1, 2: d2, 3: d3, 4: d4, 5: d5, 6: d6 };
  const order = ([1, 2, 3, 4, 5, 6] as DomainId[]).sort(
    (a, b) => A[b].level - A[a].level || A[b].score - A[a].score || a - b,
  );
  const flags = {
    u: R.flags.filter((f) => f.kind === 'u' && on(f.id)),
    m: R.flags.filter((f) => f.kind === 'm' && on(f.id)),
  };
  return { A, order, flags, csiPos, cut, startRisk };
}

/** Rang (1, 2, 3…) des volets « présents », dans l'ordre de priorité. */
export function ranks(X: Analysis, max = Infinity): Partial<Record<DomainId, number>> {
  const r: Partial<Record<DomainId, number>> = {};
  X.order
    .filter((i) => X.A[i].level === 2)
    .slice(0, max)
    .forEach((i, k) => (r[i] = k + 1));
  return r;
}

/** Lecture de gravité de l'incapacité (disBand du prototype). */
export function disBand(instr: string, dis: number | null): string {
  if (dis === null) return '';
  const v = dis;
  if (instr === 'NDI')
    return v < 10
      ? 'NDI : incapacité minimale'
      : v < 30
        ? 'NDI : incapacité légère'
        : v < 50
          ? 'NDI : incapacité modérée'
          : v < 66
            ? 'NDI : incapacité sévère'
            : 'NDI : incapacité majeure';
  if (instr === 'ODI')
    return v <= 20
      ? 'ODI : minimale'
      : v <= 40
        ? 'ODI : modérée'
        : v <= 60
          ? 'ODI : sévère'
          : v <= 80
            ? 'ODI : très sévère'
            : 'ODI : maximale';
  return 'Pas de seuils de gravité consensuels : suivre la variation.';
}
