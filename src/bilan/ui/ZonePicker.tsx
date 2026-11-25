// Choix de la zone au moment de créer un bilan. Les zones viennent du contenu (ZONES).
import { ZONES } from '../content';
import type { ZoneDef } from '../content/types';

interface Props {
  onPick: (zone: ZoneDef['id']) => void;
  onCancel: () => void;
}

export default function ZonePicker({ onPick, onCancel }: Props) {
  const zones = Object.values(ZONES).filter((z): z is ZoneDef => z !== undefined);
  return (
    <div className="bilan bilan-zones">
      <h1>Nouveau bilan</h1>
      <p className="note">Quelle zone ?</p>
      <div className="bilan-zone-list">
        {zones.map((z) => (
          <button key={z.id} type="button" className="btn bilan-zone" onClick={() => onPick(z.id)}>
            {z.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn ghost small" onClick={onCancel}>
        Annuler
      </button>
    </div>
  );
}
