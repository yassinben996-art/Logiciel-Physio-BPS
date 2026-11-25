/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adresse du relais de synchronisation (vide tant qu'il n'est pas installé). */
  readonly VITE_RELAY_URL?: string;
}
