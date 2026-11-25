// Titre d'un onglet repliable, avec l'avancement (champs remplis / champs).
export default function SectionSummary({
  title,
  filled,
  total,
}: {
  title: string;
  filled: number;
  total: number;
}) {
  return (
    <summary>
      <span className="bilan-sec-title">{title}</span>
      <span
        className={`bilan-sec-count${filled > 0 ? ' some' : ''}`}
        aria-label={`${filled} champs remplis sur ${total}`}
      >
        {filled}/{total}
      </span>
    </summary>
  );
}
