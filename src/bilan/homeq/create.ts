// Création d'un envoi de questionnaires à domicile (fournie par BilanRoot, qui parle au relais).
import type { HomeRequest } from '../state/bilan';

export interface HomeQCreate {
  /**
   * Crée le ticket sur le relais et la clé ; renvoie la demande à enregistrer dans le bilan. previousHash :
   * lien en attente à révoquer (lève HomeQAnswered si le patient y a déjà répondu).
   */
  create(ids: readonly string[], previousHash?: string): Promise<HomeRequest>;
}

/** Le patient a déjà répondu au lien en attente : pas de nouvel envoi, ses réponses vont arriver. */
export class HomeQAnswered extends Error {
  constructor() {
    super('déjà répondu');
  }
}
