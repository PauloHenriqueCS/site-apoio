/**
 * Copia o GSAP instalado em node_modules para assets/vendor/.
 * Rode depois de `npm install` ou ao atualizar a versão do GSAP.
 *   npm run vendor
 */
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(ROOT, 'node_modules/gsap/dist');
const DEST = resolve(ROOT, 'assets/vendor');

if (!existsSync(SRC)) {
  console.error('node_modules/gsap não encontrado. Rode `npm install` antes.');
  process.exit(1);
}

mkdirSync(DEST, { recursive: true });
for (const file of ['gsap.min.js', 'ScrollTrigger.min.js']) {
  copyFileSync(resolve(SRC, file), resolve(DEST, file));
  console.log('  ✓ assets/vendor/' + file);
}
