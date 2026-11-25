// Aiguillage par l'adresse : « #/bilan » ouvre le bilan standardisé, sinon l'app PDDM, inchangée.
import { useEffect, useState } from 'react';
import App from './App';
import { isPatientLocked, onPatientLockChange } from './bilan/patientGuard';
import BilanRoot from './bilan/ui/BilanRoot';

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
  return hash === '#/bilan' || locked ? <BilanRoot /> : <App />;
}
