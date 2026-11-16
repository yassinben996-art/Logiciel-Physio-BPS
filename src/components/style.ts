import type { CSSProperties } from 'react';
import { domain } from '../data/domains';
import type { DomainId, Level } from '../engine/types';

/** Variables CSS --dc / --dt d'un volet. */
export const dstyle = (id: DomainId): CSSProperties =>
  ({ '--dc': `var(${domain(id).c})`, '--dt': `var(${domain(id).t})` }) as CSSProperties;

export const levelClass = (l: Level) => (l === 2 ? 'solid' : l === 1 ? 'dash' : 'gray');
