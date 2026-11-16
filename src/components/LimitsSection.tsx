import { LIMITS } from '../data/text';
import { Cite } from './ui';

export function LimitsSection() {
  return (
    <ul className="limits">
      {LIMITS.map((l) => (
        <li key={l.lead}>
          <b>{l.lead}</b> {l.text}
          <Cite refs={l.refs} />
        </li>
      ))}
    </ul>
  );
}
