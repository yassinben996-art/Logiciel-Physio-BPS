// Zones disponibles. Ajouter une zone = ajouter son fichier de contenu et l'inscrire ici.
import { KNEE } from './knee';
import { SHOULDER } from './shoulder';
import type { ZoneDef } from './types';

export { KNEE, SHOULDER };
export const ZONES: Readonly<Partial<Record<ZoneDef['id'], ZoneDef>>> = { shoulder: SHOULDER, knee: KNEE };
