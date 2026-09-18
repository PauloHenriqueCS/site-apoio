/**
 * Verificação técnica do site — o "lint" deste projeto estático.
 *   npm run check
 *
 * Para cada página HTML pública: um único <h1>, <title> e meta description
 * únicos, canonical, robots, Open Graph e Twitter Card, lang="pt-BR",
 * JSON-LD válido, todas as <img> com alt e width/height, e todos os links,
 * scripts, estilos e imagens locais apontando para arquivos que existem.
 * Depois: sitemap.xml só com páginas existentes e robots.txt com o sitemap.
 * Sai com código 1 se encontrar qualquer problema.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://apoiocortafogo.com';
const paginas = ['index.html', '404.html', ...globSync('blog/**/index.html', { cwd: ROOT })].filter(p => existsSync(join(ROOT, p)));

const problemas = [];
const erro = (pag, msg) => problemas.push(`${pag}: ${msg}`);
const attr = (tag, nome) => (tag.match(new RegExp(`\\s${nome}=(?:"([^"]*)"|'([^']*)')`)) || [])[1];
const metas = (html) => [...html.matchAll(/<meta\s[^>]*>/g)].map(m => m[0]);
const meta = (html, chave, valor) => metas(html).find(t => attr(t, chave) === valor);
const titulos = new Map(), descricoes = new Map();

function existeLocal(href, pag) {
  if (!href || /^(https?:|mailto:|tel:|#|data:)/.test(href)) return true;
  let caminho = href.split('#')[0].split('?')[0];
  if (!caminho) return true;
  const abs = caminho.startsWith('/') ? join(ROOT, caminho) : join(ROOT, dirname(pag), caminho);
  if (existsSync(abs)) return statSync(abs).isDirectory() ? existsSync(join(abs, 'index.html')) : true;
  return false;
}

for (const pag of paginas) {
  const html = readFileSync(join(ROOT, pag), 'utf8');
  if (!/<html[^>]*\slang="pt-BR"/.test(html)) erro(pag, 'falta lang="pt-BR"');
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) erro(pag, `${h1} <h1> (esperado 1)`);
  const title = (html.match(/<title>(.*?)<\/title>/) || [])[1];
  if (!title) erro(pag, 'sem <title>'); else if (titulos.has(title)) erro(pag, `<title> repetido de ${titulos.get(title)}`); else titulos.set(title, pag);
  if (title && title.length > 70) erro(pag, `<title> com ${title.length} caracteres (ideal ≤ 70)`);
  const desc = attr(meta(html, 'name', 'description') || '', 'content');
  if (!desc) erro(pag, 'sem meta description'); else if (descricoes.has(desc)) erro(pag, `description repetida de ${descricoes.get(desc)}`); else descricoes.set(desc, pag);
  if (desc && desc.length > 165) erro(pag, `description com ${desc.length} caracteres (ideal ≤ 160)`);
  if (!/<link rel="canonical" href="https:\/\/apoiocortafogo\.com\//.test(html)) erro(pag, 'canonical ausente ou fora do domínio');
  if (!meta(html, 'name', 'robots')) erro(pag, 'sem meta robots');
  for (const p of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type']) if (!meta(html, 'property', p)) erro(pag, `sem ${p}`);
  if (!meta(html, 'name', 'twitter:card')) erro(pag, 'sem twitter:card');
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch (e) { erro(pag, 'JSON-LD inválido: ' + e.message); }
  }
  for (const img of html.matchAll(/<img\s[^>]*>/g)) {
    const t = img[0];
    if (attr(t, 'alt') === undefined) erro(pag, 'img sem alt: ' + attr(t, 'src'));
    if (!attr(t, 'width') || !attr(t, 'height')) erro(pag, 'img sem width/height: ' + attr(t, 'src'));
    if (!existeLocal(attr(t, 'src'), pag)) erro(pag, 'imagem inexistente: ' + attr(t, 'src'));
  }
  for (const m of html.matchAll(/<(?:a|link|script|source)\s[^>]*>/g)) {
    const t = m[0];
    for (const k of ['href', 'src']) { const v = attr(t, k); if (v && !existeLocal(v, pag)) erro(pag, `${k} quebrado: ${v}`); }
    for (const k of ['srcset', 'imagesrcset']) {
      const v = attr(t, k); if (!v) continue;
      for (const item of v.split(',')) { const u = item.trim().split(/\s+/)[0]; if (u && !existeLocal(u, pag)) erro(pag, `${k} quebrado: ${u}`); }
    }
    if (attr(t, 'target') === '_blank' && !/noopener/.test(attr(t, 'rel') || '')) erro(pag, 'target=_blank sem rel=noopener: ' + attr(t, 'href'));
  }
}

/* sitemap */
const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
for (const loc of locs) {
  if (!loc.startsWith(SITE + '/')) { erro('sitemap.xml', 'URL fora do domínio: ' + loc); continue; }
  if (/[?#]/.test(loc)) erro('sitemap.xml', 'URL com parâmetro: ' + loc);
  const rel = loc.slice(SITE.length + 1);
  const arq = rel === '' ? 'index.html' : join(rel, 'index.html');
  if (!existsSync(join(ROOT, arq))) erro('sitemap.xml', 'página inexistente: ' + loc);
  else { const h = readFileSync(join(ROOT, arq), 'utf8'); if (/noindex/.test(attr(meta(h, 'name', 'robots') || '', 'content') || '')) erro('sitemap.xml', 'página noindex listada: ' + loc); }
}
const indexaveis = paginas.filter(p => !/noindex/.test(attr(meta(readFileSync(join(ROOT, p), 'utf8'), 'name', 'robots') || '', 'content') || ''));
for (const p of indexaveis) {
  const url = SITE + '/' + (p === 'index.html' ? '' : p.replace(/index\.html$/, ''));
  if (!locs.includes(url)) erro('sitemap.xml', 'página indexável fora do sitemap: ' + url);
}
const robots = readFileSync(join(ROOT, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`)) erro('robots.txt', 'sem a linha Sitemap');
if (/Disallow:\s*\/(css|js|assets)\b/.test(robots)) erro('robots.txt', 'bloqueia CSS/JS/imagens');

console.log(`${paginas.length} páginas, ${locs.length} URLs no sitemap.`);
if (problemas.length) { console.log('\nProblemas:'); problemas.forEach(p => console.log('  ✗ ' + p)); process.exit(1); }
console.log('✓ nenhum problema encontrado');
