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

console.log('\nFotos');
/* Hero: duas fotos diferentes, uma por orientação de tela. */
await photo(src('01-hero-desktop.png'), 'hero-desktop', 1672, { quality: 76 });
await photo(src('01-hero-desktop.png'), 'hero-desktop@1200', 1200, { quality: 76 });
await photo(src('02-hero-mobile.png'), 'hero-mobile', 1024, { quality: 76 });
await photo(src('02-hero-mobile.png'), 'hero-mobile@768', 768, { quality: 76 });
/* Hero variante B (teste): desenho técnico com chamadas. Mesmas larguras da A. */
await photo(src('09-hero-b-desktop.png'), 'hero-b-desktop', 1672, { quality: 76 });
await photo(src('09-hero-b-desktop.png'), 'hero-b-desktop@1200', 1200, { quality: 76 });
await photo(src('10-hero-b-mobile.png'), 'hero-b-mobile', 1024, { quality: 76 });
await photo(src('10-hero-b-mobile.png'), 'hero-b-mobile@768', 768, { quality: 76 });

/* Serviços: retrato 4:5, recortado das fotos horizontais (position = onde está o assunto). */
await photo(src('06-servico-instalacao.png'),      'servico-01-instalacao', 720, { height: 900, fit: 'cover', position: 'centre' });
await photo(src('03-porta-instalada.png'),         'servico-02-manutencao', 720, { height: 900, fit: 'cover', position: 'centre' }); // provisório: ainda não veio foto de manutenção
await photo(src('07-servico-restauracao.png'),     'servico-03-restauracao', 720, { height: 900, fit: 'cover', position: 'right' });
await photo(src('08-servico-barra-antipanico.png'), 'servico-04-barras', 720, { height: 900, fit: 'cover', position: 'centre' });

/* CTA: panorâmica escura. */
await photo(src('04-porta-cta-detalhe.png'), 'cta-porta-detalhe', 1280, { quality: 76 });

/* Compartilhamento: precisa ser JPEG/PNG — redes sociais não leem WebP nem SVG. */
const og = await sharp(src('01-hero-desktop.png'))
  .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(out('og-apoio-porta-corta-fogo.jpg'));
log('og-apoio-porta-corta-fogo.jpg', og);

console.log('\nHero C (scrollytelling)');
/* Camadas separadas por tools/separar-hero-c.py em origem/hero-c/derivados/ (canvas 1024×1536).
   1024 para desktop, 768 para celular; a porta recortada no próprio tamanho. */
async function camada(input, name, widths) {
  for (const w of widths) {
    const info = await sharp(src(input)).resize({ width: w, withoutEnlargement: true }).webp({ quality: 84, alphaQuality: 80 }).toFile(out(`${name}${w === widths[0] ? '' : '@' + w}.webp`));
    log(`${name}${w === widths[0] ? '' : '@' + w}.webp`, info);
  }
}
await camada('hero-c/derivados/hero-bg.png',        'hero-c/fundo',    [1024, 768]);
await camada('hero-c/derivados/hero-blueprint.png', 'hero-c/projeto',  [1024]);          // só um tamanho: reduzir gera mais ruído de alpha
await camada('hero-c/derivados/hero-door.png',      'hero-c/porta',    [687, 480]);

console.log('\nDiagrama da porta');
/* Camadas de origem/componentes-v2/: todas no MESMO canvas (1784×882), já na
   perspectiva e escala finais. Recortamos a moldura transparente de cada uma
   e guardamos o deslocamento, para o HTML posicionar as peças em % do canvas. */
const CANVAS = { w: 1784, h: 882 };
const PECAS = [
  ['componentes-v2/01-porta-com-dois-batentes.png', 'porta/folha'],
  ['componentes-v2/02-barra-vertical-separada.png', 'porta/batente'],
  ['componentes-v2/03-mola-aerea.png',              'porta/mola'],
  ['componentes-v2/04-dobradica.png',               'porta/dobradica'],
  ['componentes-v2/05-fechadura.png',               'porta/fechadura'],
  ['componentes-v2/06-barra-antipanico.png',        'porta/barra'],
];
const medidas = { canvas: CANVAS };
for (const [file, name] of PECAS) {
  const trimmed = await sharp(src(file)).trim({ threshold: 24 }).toBuffer({ resolveWithObject: true });
  const info = await sharp(trimmed.data).webp({ quality: 86, alphaQuality: 100 }).toFile(out(name + '.webp'));
  log(name + '.webp', info);
  medidas[name.split('/')[1]] = {
    x: -trimmed.info.trimOffsetLeft, y: -trimmed.info.trimOffsetTop, w: info.width, h: info.height,
  };
}
writeFileSync(out('porta/medidas.json'), JSON.stringify(medidas, null, 2) + '\n');
console.log('  ✓ porta/medidas.json (posição e tamanho de cada peça dentro do canvas)');

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
