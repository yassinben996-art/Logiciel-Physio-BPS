import { LIMITS } from '../data/text';
import { Cite } from './ui';

export function LimitsSection() {
  return (
    <section className="card" id="s-crit" aria-labelledby="h-crit">
      <h2 id="h-crit">
        <span className="n" aria-hidden="true">
          6
        </span>
        Limites et esprit critique
      </h2>
      <ul className="limits">
        {LIMITS.map((l) => (
          <li key={l.lead}>
            <b>{l.lead}</b> {l.text}
            <Cite refs={l.refs} />
          </li>
        ))}
      </ul>
    </section>
  );
}
