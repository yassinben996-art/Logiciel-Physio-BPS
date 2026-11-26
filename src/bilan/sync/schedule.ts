// Regroupe les demandes rapprochées : la fonction n'est appelée qu'après `ms` sans nouvelle demande.
export function debounce(fn: () => void, ms: number): (() => void) & { cancel: () => void } {
  let t: ReturnType<typeof setTimeout> | null = null;
  const d = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn();
    }, ms);
  };
  d.cancel = () => {
    if (t) clearTimeout(t);
    t = null;
  };
  return d;
}
