/**
 * Processa os originais de `origem/` e escreve as versões servidas em `assets/img/`.
 * Rode com: npm run imagens
 *
 * Os originais nunca são alterados. Tudo em assets/img/ é derivado e pode ser
 * regerado a qualquer momento.
 */
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = (p) => resolve(ROOT, 'origem', p);
const out = (p) => { const f = resolve(ROOT, 'assets/img', p); mkdirSync(dirname(f), { recursive: true }); return f; };

const kb = (n) => Math.round(n / 1024) + ' kB';
const log = (name, info) => console.log(`  ✓ ${name.padEnd(46)} ${String(info.width).padStart(5)}×${String(info.height).padEnd(5)} ${kb(info.size).padStart(9)}`);

/* Foto: WebP (servido) + JPEG (fallback), numa largura alvo. */
async function photo(input, name, width, { height, fit = 'cover', position = 'centre', quality = 78 } = {}) {
  const base = sharp(input).resize({ width, height, fit, position, withoutEnlargement: true });
  log(name + '.webp', await base.clone().webp({ quality }).toFile(out(name + '.webp')));
  log(name + '.jpg', await base.clone().jpeg({ quality: quality + 4, mozjpeg: true }).toFile(out(name + '.jpg')));
}

/* Peça transparente: recorta a moldura vazia e exporta WebP com alpha. */
async function part(input, name, width) {
  const trimmed = await sharp(input).trim({ threshold: 6 }).toBuffer();
  const info = await sharp(trimmed)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 86, alphaQuality: 100 })
    .toFile(out(name + '.webp'));
  log(name + '.webp', info);
  return info;
}

console.log('\nFotos');
/* Hero: duas fotos diferentes, uma por orientação de tela. */
await photo(src('01-hero-desktop.png'), 'hero-desktop', 1672, { quality: 76 });
await photo(src('01-hero-desktop.png'), 'hero-desktop@1200', 1200, { quality: 76 });
await photo(src('02-hero-mobile.png'), 'hero-mobile', 1024, { quality: 76 });
await photo(src('02-hero-mobile.png'), 'hero-mobile@768', 768, { quality: 76 });

/* Serviços: retrato 4:5. */
await photo(src('03-porta-instalada.png'), 'servico-01-instalacao', 720, { height: 900, fit: 'cover', position: 'centre' });

/* CTA: panorâmica escura. */
await photo(src('04-porta-cta-detalhe.png'), 'cta-porta-detalhe', 1280, { quality: 76 });

/* Compartilhamento: precisa ser JPEG/PNG — redes sociais não leem WebP nem SVG. */
const og = await sharp(src('01-hero-desktop.png'))
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(out('og-apoio-porta-corta-fogo.jpg'));
log('og-apoio-porta-corta-fogo.jpg', og);

console.log('\nDiagrama da porta');
await part(src('05-porta-explodida-completa.png'), 'porta/explodida-completa', 1400);
const PECAS = [
  ['componentes/01-folha-da-porta.png',   'porta/folha',    620],
  ['componentes/02-batente.png',          'porta/batente',  620],
  ['componentes/03-mola-aerea.png',       'porta/mola',     520],
  ['componentes/04-dobradica.png',        'porta/dobradica', 360],
  ['componentes/05-fechadura.png',        'porta/fechadura', 300],
  ['componentes/06-barra-antipanico.png', 'porta/barra',    560],
];
const medidas = {};
for (const [file, name, w] of PECAS) {
  const info = await part(src(file), name, w);
  medidas[name.split('/')[1]] = { w: info.width, h: info.height };
}
writeFileSync(out('porta/medidas.json'), JSON.stringify(medidas, null, 2) + '\n');
console.log('  ✓ porta/medidas.json (proporção real de cada peça, já recortada)');

console.log('\nLogotipo');
/* Variante clara: o logo é preto com detalhe laranja e some sobre o hero escuro.
   Invertemos só os pixels neutros (o laranja da marca é preservado). */
const logoSrc = src('logos/logo-apoio-porta-corta-fogo.png');
const { data, info } = await sharp(logoSrc).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const px = Buffer.from(data);
for (let i = 0; i < px.length; i += info.channels) {
  const r = px[i], g = px[i + 1], b = px[i + 2];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (sat < 0.25) {                    // neutro → inverte
    px[i] = 255 - r; px[i + 1] = 255 - g; px[i + 2] = 255 - b;
  }                                    // cromático (laranja) → mantém
}
const logoLight = await sharp(px, { raw: { width: info.width, height: info.height, channels: info.channels } })
  .png({ compressionLevel: 9 }).toBuffer();

for (const [input, name] of [[logoSrc, 'logo-apoio'], [logoLight, 'logo-apoio-branco']]) {
  log(name + '.webp', await sharp(input).resize({ width: 582, withoutEnlargement: true })
    .webp({ quality: 92, alphaQuality: 100 }).toFile(out(name + '.webp')));
  log(name + '.png', await sharp(input).resize({ width: 582, withoutEnlargement: true })
    .png({ compressionLevel: 9 }).toFile(out(name + '.png')));
}

console.log('\nLogos de clientes');
const CLIENTES = [
  '01-masotti.jpg', '02-tv-med.jpg', '03-shopping-patio-paulista.jpg', '04-adbens-condominios.png',
  '05-prevent-senior.png', '06-itau-cultural-e-itau.jpg', '07-metodo.jpg', '08-mercure.jpg',
];
for (const file of CLIENTES) {
  const name = 'clientes/' + file.replace(/\.(jpg|png)$/, '');
  log(name + '.webp', await sharp(src('logos/clientes/' + file))
    .resize({ width: 338, withoutEnlargement: true })   // 2× o tamanho publicado, para telas retina
    .webp({ quality: 88 }).toFile(out(name + '.webp')));
}

console.log('\nPronto.\n');
