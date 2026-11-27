// Aiguillage par l'adresse : « #/bilan » ouvre le bilan standardisé, sinon l'app PDDM, inchangée.
import { useEffect, useState } from 'react';
import App from './App';
import { isPatientLocked, onPatientLockChange } from './bilan/patientGuard';
import BilanRoot from './bilan/ui/BilanRoot';
import PatientHomeQ from './bilan/ui/PatientHomeQ';
import { RELAY_URL } from './bilan/sync/config';

export default function Root() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const h = () => setHash(location.hash);
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  // En mode patient, l'adresse ne permet pas de quitter l'accueil.
  const [locked, setLocked] = useState(isPatientLocked());
  useEffect(() => onPatientLockChange(() => setLocked(isPatientLocked())), []);
  // L'adresse modifiée par le patient est aussitôt remise sur le bilan : un rechargement ramène donc à
  // l'écran du PIN, jamais à l'app PDDM.
  useEffect(() => {
    if (locked && !hash.startsWith('#/bilan')) location.hash = '#/bilan';
  }, [locked, hash]);
  // Questionnaires à domicile (téléphone du patient). Jamais pendant le mode patient d'un appareil du physio.
  if (!locked && hash.startsWith('#/q?')) return <PatientHomeQ hash={hash} relayUrl={RELAY_URL} />;
  return hash.startsWith('#/bilan') || locked ? <BilanRoot /> : <App />;
}
