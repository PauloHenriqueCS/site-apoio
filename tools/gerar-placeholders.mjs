/**
 * Gera as imagens temporárias do site (SVG leve, sem dependências).
 * Rode com: npm run placeholders
 *
 * Cada arquivo gerado aqui deve ser substituído pela imagem real.
 * Ver assets/img/LEIA-ME.md para a lista e as dimensões esperadas.
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

/* ---------- Cena fotográfica temporária ---------- */
function scene({ w, h, label, tone = 'dark' }) {
  const bg = tone === 'dark' ? '#3A4046' : '#D8DADC';
  const bg2 = tone === 'dark' ? '#1C2024' : '#B9BDC1';
  const door = tone === 'dark' ? '#596069' : '#9DA3A9';
  const doorEdge = tone === 'dark' ? '#767E86' : '#7D848B';
  const text = tone === 'dark' ? 'rgba(255,255,255,.30)' : 'rgba(26,29,33,.42)';

  // porta centralizada, ocupando ~48% da altura
  const dh = h * 0.62, dw = dh * 0.42;
  const dx = (w - dw) / 2, dy = (h - dh) / 2 + h * 0.04;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/><stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
    <linearGradient id="dr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${doorEdge}"/><stop offset="100%" stop-color="${door}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <!-- perspectiva de corredor -->
  <g stroke="${doorEdge}" stroke-width="1" opacity=".45" fill="none">
    <path d="M0 ${h * 0.16} L${w * 0.3} ${h * 0.3} M0 ${h * 0.9} L${w * 0.3} ${h * 0.74}"/>
    <path d="M${w} ${h * 0.16} L${w * 0.7} ${h * 0.3} M${w} ${h * 0.9} L${w * 0.7} ${h * 0.74}"/>
    <rect x="${w * 0.3}" y="${h * 0.3}" width="${w * 0.4}" height="${h * 0.44}"/>
  </g>
  <!-- porta corta-fogo -->
  <rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" rx="2" fill="url(#dr)"/>
  <rect x="${dx + dw * 0.12}" y="${dy + dh * 0.1}" width="${dw * 0.76}" height="${dh * 0.26}" rx="2" fill="${bg2}" opacity=".7"/>
  <rect x="${dx + dw * 0.1}" y="${dy + dh * 0.52}" width="${dw * 0.8}" height="${dh * 0.035}" rx="3" fill="${BRAND}"/>
  <rect x="${dx - 5}" y="${dy}" width="5" height="${dh}" fill="${BRAND}" opacity=".85"/>
  <!-- etiqueta -->
  <text x="${w / 2}" y="${Math.max(26, h * 0.07)}" text-anchor="middle"
        font-family="Inter, Arial, sans-serif" font-size="${Math.max(11, w * 0.013)}"
        letter-spacing="2.5" fill="${text}">IMAGEM TEMPORÁRIA — ${label.toUpperCase()}</text>
</svg>`;
}

/* ---------- Logotipo ---------- */
const makeLogo = (fg, boxFill, wordFill) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 380 88" width="380" height="88" role="img" aria-label="Apoio — Instalação e Manutenção de Porta Corta Fogo">
  <rect width="380" height="88" fill="none"/>
  <text x="6" y="17" font-family="Inter, Arial, sans-serif" font-size="11" font-weight="600"
        letter-spacing="1.6" fill="${fg}">INSTALAÇÃO &amp; MANUTENÇÃO</text>
  <g>
    <polygon points="6,26 356,26 374,47 356,68 6,68" fill="${boxFill}"/>
    <polygon points="6,26 44,26 26,47 44,68 6,68" fill="${BRAND}"/>
    <text x="64" y="59" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="700"
          letter-spacing="7" fill="${wordFill}">APOIO</text>
  </g>
  <text x="196" y="83" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="11"
        font-weight="600" letter-spacing="5" fill="${fg}">PORTA CORTA FOGO</text>
</svg>`;

// escura, para fundo claro / clara, para o hero escuro
const logo = makeLogo(INK, INK, '#FFFFFF');
const logoBranco = makeLogo('#FFFFFF', '#FFFFFF', INK);

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="10" fill="${INK}"/>
  <rect x="18" y="12" width="28" height="40" rx="2" fill="#C6CBD0"/>
  <rect x="14" y="12" width="5" height="40" fill="${BRAND}"/>
  <rect x="22" y="33" width="20" height="4" rx="2" fill="${BRAND}"/>
  <rect x="24" y="19" width="16" height="10" rx="1" fill="#EDF1F4"/>
</svg>`;

/* ---------- Logos de clientes ---------- */
const CLIENTES = [
  'Shopping Pátio Paulista', 'Itaú Cultural', 'Prevent Senior', 'Método', 'TV Med', 'Mercure',
  'Cliente 07', 'Cliente 08', 'Cliente 09', 'Cliente 10', 'Cliente 11', 'Cliente 12',
  'Cliente 13', 'Cliente 14', 'Cliente 15', 'Cliente 16', 'Cliente 17', 'Cliente 18'
];

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function clientLogo(name) {
  const label = name.length > 18 ? name.split(' ').slice(0, 2).join(' ') : name;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 76" width="220" height="76" role="img" aria-label="${name}">
  <rect x="1" y="1" width="218" height="74" rx="3" fill="#F2F1EE" stroke="#DBD9D3" stroke-dasharray="5 4"/>
  <text x="110" y="34" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="15"
        font-weight="600" fill="#5A6066">${label}</text>
  <text x="110" y="53" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="9"
        letter-spacing="1.6" fill="#9AA0A6">LOGO TEMPORÁRIO</text>
</svg>`;
}

/* ---------- Execução ---------- */
console.log('Gerando imagens temporárias…');

write('assets/img/logo-apoio.svg', logo);
write('assets/img/logo-apoio-branco.svg', logoBranco);
write('assets/img/favicon.svg', favicon);

write('assets/img/hero-porta-corta-fogo.svg',
  scene({ w: 1600, h: 900, label: 'Hero — técnico em porta corta-fogo', tone: 'dark' }));

write('assets/img/servico-01-instalacao.svg',
  scene({ w: 640, h: 800, label: 'Instalação', tone: 'light' }));
write('assets/img/servico-02-manutencao.svg',
  scene({ w: 640, h: 800, label: 'Manutenção', tone: 'light' }));
write('assets/img/servico-03-restauracao.svg',
  scene({ w: 640, h: 800, label: 'Restauração', tone: 'light' }));
write('assets/img/servico-04-barras.svg',
  scene({ w: 640, h: 800, label: 'Barras antipânico', tone: 'light' }));

write('assets/img/cta-porta-detalhe.svg',
  scene({ w: 720, h: 620, label: 'Detalhe da porta', tone: 'dark' }));

write('assets/img/og-apoio-porta-corta-fogo.svg',
  scene({ w: 1200, h: 630, label: 'Compartilhamento', tone: 'dark' }));

CLIENTES.forEach((name, i) => {
  const n = String(i + 1).padStart(2, '0');
  write(`assets/img/clientes/${n}-${slug(name)}.svg`, clientLogo(name));
});

console.log('\nPronto. Substitua estes arquivos pelas imagens reais (ver assets/img/LEIA-ME.md).');
