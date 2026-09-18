/**
 * Gera as imagens que ainda NÃO chegaram, como marcador visual.
 * Rode com: npm run placeholders
 *
 * Todo o resto do site já usa material definitivo, processado por
 * tools/processar-imagens.mjs a partir da pasta origem/.
 * O que falta está listado em assets/img/LEIA-ME.md.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BRAND = '#F5A623';
const INK = '#1A1D21';

const write = (rel, content) => {
  const out = resolve(ROOT, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, content.trim() + '\n', 'utf8');
  console.log('  ✓', rel);
};

/* Marcador de foto ausente: silhueta de porta corta-fogo + etiqueta. */
function scene({ w, h, label }) {
  const dh = h * 0.62, dw = dh * 0.42;
  const dx = (w - dw) / 2, dy = (h - dh) / 2 + h * 0.04;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#D8DADC"/><stop offset="100%" stop-color="#B9BDC1"/>
    </linearGradient>
    <linearGradient id="dr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7D848B"/><stop offset="100%" stop-color="#9DA3A9"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g stroke="#7D848B" stroke-width="1" opacity=".45" fill="none">
    <path d="M0 ${h * 0.16} L${w * 0.3} ${h * 0.3} M0 ${h * 0.9} L${w * 0.3} ${h * 0.74}"/>
    <path d="M${w} ${h * 0.16} L${w * 0.7} ${h * 0.3} M${w} ${h * 0.9} L${w * 0.7} ${h * 0.74}"/>
    <rect x="${w * 0.3}" y="${h * 0.3}" width="${w * 0.4}" height="${h * 0.44}"/>
  </g>
  <rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="2" fill="url(#dr)"/>
  <rect x="${dx + dw * 0.12}" y="${dy + dh * 0.1}" width="${dw * 0.76}" height="${dh * 0.26}" rx="2" fill="#B9BDC1" opacity=".7"/>
  <rect x="${dx + dw * 0.1}" y="${dy + dh * 0.52}" width="${dw * 0.8}" height="${dh * 0.035}" rx="3" fill="${BRAND}"/>
  <rect x="${dx - 5}" y="${dy}" width="5" height="${dh}" fill="${BRAND}" opacity=".85"/>
  <text x="${w / 2}" y="${Math.max(26, h * 0.07)}" text-anchor="middle"
        font-family="Inter, Arial, sans-serif" font-size="${Math.max(11, w * 0.022)}"
        letter-spacing="2.5" fill="rgba(26,29,33,.45)">FOTO PENDENTE — ${label.toUpperCase()}</text>
</svg>`;
}

/* Ícone da aba: pictograma próprio. O logotipo é largo demais para um quadrado. */
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="10" fill="${INK}"/>
  <rect x="18" y="12" width="28" height="40" rx="2" fill="#C6CBD0"/>
  <rect x="14" y="12" width="5" height="40" fill="${BRAND}"/>
  <rect x="22" y="33" width="20" height="4" rx="2" fill="${BRAND}"/>
  <rect x="24" y="19" width="16" height="10" rx="1" fill="#EDF1F4"/>
</svg>`;

console.log('Gerando marcadores das imagens que ainda faltam…');
write('assets/img/favicon.svg', favicon);
console.log('\nPronto. O que falta está em assets/img/LEIA-ME.md.');
