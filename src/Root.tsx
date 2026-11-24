// Aiguillage par l'adresse : « #/bilan » ouvre le bilan standardisé, sinon l'app PDDM, inchangée.
import { useEffect, useState } from 'react';
import App from './App';
import BilanApp from './bilan/ui/BilanApp';

export default function Root() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const h = () => setHash(location.hash);
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  return hash === '#/bilan' ? <BilanApp /> : <App />;
}
