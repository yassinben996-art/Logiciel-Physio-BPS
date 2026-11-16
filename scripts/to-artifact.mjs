// Convertit dist-single/index.html en page Artifact claude.ai : la plateforme ajoute elle-même
// <!doctype>, <html>, <head> et <body> ; on garde <title>, les métadonnées utiles, <style> et <script>.
import fs from 'node:fs';

const [src = 'dist-single/index.html', out = 'dist-single/artifact.html'] = process.argv.slice(2);
const html = fs.readFileSync(src, 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? '<title>Profil des moteurs de douleur</title>';
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]);
const scripts = [...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0]);
const page = [
  title,
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<meta name="description" content="Aide au raisonnement clinique (non validée) pour physiothérapeutes.">',
  ...styles,
  '<div id="root"></div>',
  '<noscript>Cette application nécessite JavaScript.</noscript>',
  ...scripts,
].join('\n');
fs.writeFileSync(out, page);
console.log(
  `${out} : ${(page.length / 1024).toFixed(0)} ko, ${styles.length} style(s), ${scripts.length} script(s)`,
);
