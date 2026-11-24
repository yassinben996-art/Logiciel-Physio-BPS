// Zones disponibles. Ajouter une zone = ajouter son fichier de contenu et l'inscrire ici.
import { SHOULDER } from './shoulder';
import type { ZoneDef } from './types';

export { SHOULDER };
export const ZONES: Readonly<Partial<Record<ZoneDef['id'], ZoneDef>>> = { shoulder: SHOULDER };
