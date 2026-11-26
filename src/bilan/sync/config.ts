// Adresse du relais de synchronisation, fournie au moment de la construction du site
// (variable RELAY_URL du dépôt GitHub, voir docs/GUIDE-SYNCHRONISATION.md). Vide = pas encore installé.
export const RELAY_URL: string = (import.meta.env.VITE_RELAY_URL ?? '').trim();
