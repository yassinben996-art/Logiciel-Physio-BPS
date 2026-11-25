import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Stroke } from '../src/bilan/bodychart/geometry';
import { INTAKE } from '../src/bilan/content/intake';
import BodyChart from '../src/bilan/ui/BodyChart';

beforeEach(() => {
  vi.spyOn(SVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 200,
    height: 420,
    right: 200,
    bottom: 420,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

const front = () => screen.getByRole('img', { name: 'Body chart, vue de face' });
const back = () => screen.getByRole('img', { name: 'Body chart, vue de dos' });
const draw = (el: Element, pts: [number, number][]) => {
  const [first, ...rest] = pts;
  fireEvent.pointerDown(el, { clientX: first![0], clientY: first![1], pointerId: 1 });
  for (const [x, y] of rest) fireEvent.pointerMove(el, { clientX: x, clientY: y, pointerId: 1 });
  fireEvent.pointerUp(el, { pointerId: 1 });
};
const S: Stroke = { pen: 'douleur', view: 'front', by: 'physio', pts: [10, 10, 40, 40] };

describe('BodyChart', () => {
  it('un seul crayon : pas de sélecteur', () => {
    render(<BodyChart strokes={[]} pens={[INTAKE.pens[0]!]} by="patient" onStroke={() => {}} />);
    expect(screen.queryByRole('group', { name: 'Crayon' })).toBeNull();
  });
  it('plusieurs crayons : sélecteur, Douleur par défaut', () => {
    render(<BodyChart strokes={[]} pens={INTAKE.pens} by="physio" onStroke={() => {}} />);
    expect(within(screen.getByRole('group', { name: 'Crayon' })).getByLabelText('Douleur')).toBeChecked();
  });
  it('dessin à la souris sur la vue de face', () => {
    const onStroke = vi.fn();
    render(<BodyChart strokes={[]} pens={INTAKE.pens} by="physio" onStroke={onStroke} />);
    draw(front(), [
      [10, 10],
      [20, 20],
      [30, 30],
    ]);
    expect(onStroke).toHaveBeenCalledWith({
      pen: 'douleur',
      view: 'front',
      by: 'physio',
      pts: [10, 10, 20, 20, 30, 30],
    });
  });
  it('autre crayon, vue de dos', () => {
    const onStroke = vi.fn();
    render(<BodyChart strokes={[]} pens={INTAKE.pens} by="physio" onStroke={onStroke} />);
    fireEvent.click(screen.getByLabelText('Fourmillements'));
    draw(back(), [
      [50, 50],
      [60, 70],
    ]);
    expect(onStroke).toHaveBeenCalledWith(expect.objectContaining({ pen: 'fourmillements', view: 'back' }));
  });
  it('un clic seul n’enregistre rien', () => {
    const onStroke = vi.fn();
    render(<BodyChart strokes={[]} pens={INTAKE.pens} by="physio" onStroke={onStroke} />);
    draw(front(), [[10, 10]]);
    expect(onStroke).not.toHaveBeenCalled();
  });
  it('gomme', () => {
    const onErase = vi.fn();
    const { container } = render(
      <BodyChart
        strokes={[S, { ...S, pen: 'irradiation' }]}
        pens={INTAKE.pens}
        by="physio"
        onStroke={() => {}}
        onErase={onErase}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gomme' }));
    expect(screen.getByRole('button', { name: 'Gomme' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.pointerDown(container.querySelectorAll('polyline.bc-stroke')[1]!, {
      clientX: 20,
      clientY: 20,
      pointerId: 1,
    });
    expect(onErase).toHaveBeenCalledWith(1);
  });
  it('annuler le dernier trait', () => {
    const onUndo = vi.fn();
    const { rerender } = render(
      <BodyChart strokes={[]} pens={INTAKE.pens} by="physio" onStroke={() => {}} onUndo={onUndo} />,
    );
    expect(screen.getByRole('button', { name: 'Annuler le dernier trait' })).toBeDisabled();
    rerender(<BodyChart strokes={[S]} pens={INTAKE.pens} by="physio" onStroke={() => {}} onUndo={onUndo} />);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler le dernier trait' }));
    expect(onUndo).toHaveBeenCalled();
  });
  it('sans onErase ni onUndo : pas de boutons', () => {
    render(<BodyChart strokes={[S]} pens={[INTAKE.pens[0]!]} by="patient" onStroke={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Gomme' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Annuler le dernier trait' })).toBeNull();
  });

  it('un deuxième doigt ne perd pas le trait en cours', () => {
    const onStroke = vi.fn();
    render(<BodyChart strokes={[]} pens={INTAKE.pens} by="physio" onStroke={onStroke} />);
    fireEvent.pointerDown(front(), { clientX: 10, clientY: 10, pointerId: 1 });
    fireEvent.pointerMove(front(), { clientX: 20, clientY: 20, pointerId: 1 });
    fireEvent.pointerDown(front(), { clientX: 150, clientY: 300, pointerId: 2 });
    fireEvent.pointerMove(front(), { clientX: 155, clientY: 305, pointerId: 2 });
    fireEvent.pointerUp(front(), { pointerId: 2 });
    fireEvent.pointerMove(front(), { clientX: 30, clientY: 30, pointerId: 1 });
    fireEvent.pointerUp(front(), { pointerId: 1 });
    expect(onStroke).toHaveBeenCalledTimes(1);
    expect(onStroke).toHaveBeenCalledWith(expect.objectContaining({ pts: [10, 10, 20, 20, 30, 30] }));
  });
  it('les traits du patient ne sont pas effaçables', () => {
    const onErase = vi.fn();
    const { container } = render(
      <BodyChart
        strokes={[{ ...S, by: 'patient' }]}
        pens={INTAKE.pens}
        by="physio"
        onStroke={() => {}}
        onErase={onErase}
        onUndo={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gomme' }));
    fireEvent.pointerDown(container.querySelector('polyline.bc-stroke')!, {
      clientX: 20,
      clientY: 20,
      pointerId: 1,
    });
    expect(onErase).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Annuler le dernier trait' })).toBeDisabled();
  });
});
