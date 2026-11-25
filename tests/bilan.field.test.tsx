import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { SectionDef } from '../src/bilan/content/types';
import { emptyBilan } from '../src/bilan/state/bilan';
import FieldInput from '../src/bilan/ui/FieldInput';

const src = { ref: 'test', added: '2026-11-24' };
const sec: SectionDef = {
  id: 's',
  title: 'S',
  source: src,
  fields: [{ kind: 'number', id: 'eva', label: 'Douleur EVA', min: 0, max: 10, source: src }],
};

describe('FieldInput', () => {
  it('nombre non latéralisé : un seul id, champ nommé par son libellé', () => {
    const { container } = render(
      <FieldInput
        section={sec}
        field={sec.fields[0]!}
        state={emptyBilan('shoulder')}
        dispatch={() => {}}
        hits={[]}
      />,
    );
    const ids = [...container.querySelectorAll('[id]')].map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(screen.getByLabelText('Douleur EVA').tagName).toBe('INPUT');
  });
});
