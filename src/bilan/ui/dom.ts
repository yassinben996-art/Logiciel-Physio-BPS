/** Id DOM d'un champ, pour y faire défiler la page depuis une suggestion. */
export const fieldDomId = (key: string) => 'bf-' + key.replace(/\./g, '-');

/** Fait défiler jusqu'au champ ciblé (« s.f » ou « s.f.chip »), ouvre son onglet et y place le focus. */
export function goToField(target: string) {
  const parts = target.split('.');
  const el =
    document.getElementById(fieldDomId(target)) ??
    document.getElementById(fieldDomId(parts.slice(0, 2).join('.')));
  const details = el?.closest('details');
  if (details) details.open = true;
  el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  el?.focus({ preventScroll: true });
}
