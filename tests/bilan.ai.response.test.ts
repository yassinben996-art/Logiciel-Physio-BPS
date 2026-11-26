import { QUESTIONNAIRES } from '@q';
import { SHOULDER } from '../src/bilan/content';
import { AI_SYSTEM_PROMPT, CLAUDE_PROMPT } from '../src/bilan/content/aiPrompt';
import { parseAiResponse } from '../src/bilan/ai/response';

const qs = QUESTIONNAIRES.map((q) => ({ id: q.id, name: q.name }));
const json = (items: unknown[]) => JSON.stringify({ suggestions: items });
const two = json([
  { type: 'hypothese', label: 'Tendinopathie du sus-épineux', reason: 'Douleur à l’élévation' },
  { type: 'drapeau', label: 'Vérifier une atteinte radiculaire', reason: 'Paresthésies notées' },
]);
const BAD = 'L’IA a répondu de façon inattendue';

describe('réponse de l’IA', () => {
  it('JSON valide', () => {
    const r = parseAiResponse(two, SHOULDER, qs);
    expect(r.map((x) => x.kind)).toEqual(['hypothese', 'drapeau']);
    expect(r[0]!.reason).toBe('Douleur à l’élévation');
    expect(new Set(r.map((x) => x.id)).size).toBe(2);
  });
  it('entouré de texte et de ```json', () =>
    expect(parseAiResponse('Voici :\n```json\n' + two + '\n```\nBonne séance', SHOULDER, qs)).toHaveLength(
      2,
    ));
  it('au plus 5', () =>
    expect(
      parseAiResponse(
        json(Array.from({ length: 12 }, (_, i) => ({ type: 'hypothese', label: `H${i}`, reason: 'r' }))),
        SHOULDER,
        qs,
      ),
    ).toHaveLength(5));
  it('type inconnu ignoré', () =>
    expect(
      parseAiResponse(
        json([
          { type: 'diagnostic', label: 'x', reason: 'r' },
          { type: 'test', label: 'Neer', reason: 'r' },
        ]),
        SHOULDER,
        qs,
      ).map((x) => x.kind),
    ).toEqual(['test']));
  it('réponses illisibles', () => {
    expect(() => parseAiResponse('désolé', SHOULDER, qs)).toThrow(BAD);
    expect(() => parseAiResponse('{"suggestions":[{"type":"test"', SHOULDER, qs)).toThrow(BAD);
    expect(() => parseAiResponse('{"suggestions":[]}', SHOULDER, qs)).toThrow(BAD);
  });
  it('test connu rattaché au contenu', () =>
    expect(
      parseAiResponse(json([{ type: 'test', label: 'Test de Neer', reason: 'r' }]), SHOULDER, qs)[0]!.target,
    ).toBe('tests.neer'));
  it('questionnaire connu rattaché', () =>
    expect(
      parseAiResponse(
        json([{ type: 'questionnaire', label: 'Questionnaire TSK', reason: 'r' }]),
        SHOULDER,
        qs,
      )[0]!.target,
    ).toBe('tsk'));
  it('test inconnu sans rattachement', () =>
    expect(
      parseAiResponse(json([{ type: 'test', label: 'Test du ventilateur', reason: 'r' }]), SHOULDER, qs)[0]!
        .target,
    ).toBeUndefined());
  it('textes tronqués', () => {
    const r = parseAiResponse(
      json([{ type: 'hypothese', label: 'x'.repeat(300), reason: 'y'.repeat(500) }]),
      SHOULDER,
      qs,
    )[0]!;
    expect(r.label.length).toBeLessThanOrEqual(120);
    expect(r.reason.length).toBeLessThanOrEqual(240);
  });
  it('consignes', () => {
    expect(AI_SYSTEM_PROMPT).toContain('"suggestions"');
    expect(AI_SYSTEM_PROMPT).toContain('5');
    expect(CLAUDE_PROMPT.length).toBeGreaterThan(100);
  });
});
