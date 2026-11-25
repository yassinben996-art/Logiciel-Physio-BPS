// Réponses de l'accueil, en lecture seule, en tête du bilan.
import { P_DURATION, P_ONSET } from '../../data/patient';
import { SCREENING } from '../content/intake';
import type { Intake } from '../state/intake';
import BodyChart from './BodyChart';

const frDateTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : `${d.toLocaleDateString('fr-CH')} à ${d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' })}`;
};

export default function IntakeSummary({ intake: i }: { intake: Intake }) {
  const yes = SCREENING.filter((q) => i.screening[q.id] === true).map((q) => q.short);
  const no = SCREENING.filter((q) => i.screening[q.id] === false).map((q) => q.short);
  const when = frDateTime(i.completedAt);
  return (
    <section className="bilan-intake" aria-label="Accueil rempli par le patient">
      <h2>
        Accueil rempli par le patient{i.completedAt === '' ? ' · non terminé' : when ? ` · ${when}` : ''}
      </h2>
      <div className="bilan-intake-grid">
        <BodyChart selected={i.regions} />
        <ul className="bilan-intake-list">
          <li>Douleur maintenant : {i.painNow === null ? 'non renseignée' : `${i.painNow}/10`}</li>
          <li>
            Douleur la plus forte (7 jours) : {i.painWorst === null ? 'non renseignée' : `${i.painWorst}/10`}
          </li>
          <li>Durée : {i.duration ? P_DURATION[i.duration] : 'non renseignée'}</li>
          <li>Début : {i.onset ? P_ONSET[i.onset] : 'non renseigné'}</li>
          <li>
            PSFS :{' '}
            {i.psfs.length
              ? i.psfs
                  .map((p) => `${p.activity} ${p.score === null ? '(non noté)' : `${p.score}/10`}`)
                  .join(' ; ')
              : 'aucune activité citée'}
          </li>
          <li>Dépistage, oui : {yes.length ? yes.join(', ') : 'aucun'}</li>
          {no.length > 0 && <li>Dépistage, non : {no.join(', ')}</li>}
        </ul>
      </div>
    </section>
  );
}
