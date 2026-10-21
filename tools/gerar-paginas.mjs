/**
 * Gera as páginas de conteúdo a partir de conteudo/paginas/*.md
 * (serviços, serviços locais, produtos, segmentos, hub, institucional, contato)
 * e os artigos de blog do mesmo material. Depois reescreve o sitemap.xml
 * varrendo TODAS as páginas geradas (home + blog + estas), fora as noindex.
 *
 *   npm run paginas          (rode depois de npm run blog; ou use npm run build)
 *
 * Fonte = Markdown com frontmatter YAML. Nada de dado inventado: seções cujo
 * corpo é só um comentário HTML (ex.: NAP pendente) não são renderizadas, e
 * páginas com bloqueio != "nenhum" saem com noindex e ficam fora do sitemap.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://apoiocortafogo.com';
const MARCA = 'Apoio Corta Fogo';
const OG_SITE = `${SITE}/assets/img/og-apoio-porta-corta-fogo.jpg`;
const OG_BLOG = `${SITE}/assets/img/blog/og-blog.jpg`;
// DATA_SITE=AAAA-MM-DD fixa a data usada em publicação/lastmod, para regerar sem
// mudar a data de páginas que não foram alteradas.
const HOJE = process.env.DATA_SITE || new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripTags = (s) => s.replace(/<[^>]+>/g, '');
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const dataLonga = (iso) => { const [a, m, d] = iso.split('-'); return `${parseInt(d, 10)} de ${MESES[parseInt(m, 10) - 1]} de ${a}`; };

/* ---------- Ícones (iguais aos do gerador do blog) ---------- */
const ARROW = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8h11m0 0L9.5 4m4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW_NE = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12L12 4M12 4H6M12 4v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PHONE = '<svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M17.5 14.1v2.4a1.6 1.6 0 0 1-1.8 1.6 15.9 15.9 0 0 1-6.9-2.5 15.6 15.6 0 0 1-4.8-4.8A15.9 15.9 0 0 1 1.5 3.8 1.6 1.6 0 0 1 3.1 2h2.4a1.6 1.6 0 0 1 1.6 1.4c.1.8.3 1.5.6 2.2a1.6 1.6 0 0 1-.4 1.7l-1 1a12.8 12.8 0 0 0 4.8 4.8l1-1a1.6 1.6 0 0 1 1.7-.4c.7.3 1.4.5 2.2.6a1.6 1.6 0 0 1 1.5 1.8Z"/></svg>';
const WA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 5.82 2.41 8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.71-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.06 0 1.22.89 2.39 1.01 2.56.12.16 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z"/></svg>';
const WA_URL = 'https://wa.me/5511991961322?text=Ol%C3%A1%21%20Gostaria%20de%20um%20or%C3%A7amento%20para%20portas%20corta-fogo.';

/* ---------- Cabeçalho e rodapé (mesmos da home/blog, links absolutos) ---------- */
const LOGO = (lazy) => `<picture>
        <source srcset="/assets/img/logo-apoio.webp" type="image/webp">
        <img src="/assets/img/logo-apoio.png" alt="${MARCA} — Instalação e Manutenção de Portas Corta-Fogo" width="291" height="117"${lazy ? ' loading="lazy"' : ''}>
      </picture>`;
const NAV = (cls) => `<a class="${cls}" href="/#servicos">Serviços</a>
      <a class="${cls}" href="/#produtos">Produtos</a>
      <a class="${cls}" href="/#empresa">A empresa</a>
      <a class="${cls}" href="/#clientes">Clientes</a>
      <a class="${cls}" href="/blog/">Blog</a>
      <a class="${cls}" href="/#contato">Contato</a>`;

const header = () => `<header class="header rail" id="header">
  <div class="container header__inner">
    <a class="logo" href="/" aria-label="${MARCA} — página inicial">
      ${LOGO(false)}
    </a>
    <nav class="nav" id="nav" aria-label="Navegação principal">
      ${NAV('nav__link')}
      <a class="btn btn--primary btn--sm" href="/#orcamento">Solicitar orçamento ${ARROW_NE}</a>
    </nav>
    <a class="btn btn--primary btn--sm header__cta" href="/#orcamento">Solicitar orçamento ${ARROW_NE}</a>
    <button class="nav-toggle" id="navToggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Abrir menu"><span></span></button>
  </div>
</header>`;

const footer = () => `<footer class="footer rail">
  <div class="container footer__inner">
    <a class="logo" href="/" aria-label="${MARCA} — página inicial">
      ${LOGO(true)}
    </a>
    <nav class="footer__cols" aria-label="Rodapé">
      <div class="footer__col">
        <p class="footer__title">Serviços</p>
        <ul>
          <li><a href="/instalacao-de-porta-corta-fogo/">Instalação</a></li>
          <li><a href="/manutencao-de-porta-corta-fogo/">Manutenção</a></li>
          <li><a href="/restauracao-de-porta-corta-fogo/">Restauração</a></li>
          <li><a href="/barra-antipanico/">Barra antipânico</a></li>
          <li><a href="/produtos/">Produtos</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <p class="footer__title">Atendimento</p>
        <ul>
          <li><a href="/manutencao-porta-corta-fogo-centro-sp/">Centro</a></li>
          <li><a href="/manutencao-porta-corta-fogo-zona-sul-sp/">Zona Sul</a></li>
          <li><a href="/manutencao-porta-corta-fogo-zona-oeste-sp/">Zona Oeste</a></li>
          <li><a href="/manutencao-porta-corta-fogo-zona-norte-sp/">Zona Norte</a></li>
          <li><a href="/manutencao-porta-corta-fogo-zona-leste-sp/">Zona Leste</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <p class="footer__title">Empresa</p>
        <ul>
          <li><a href="/a-empresa/">A empresa</a></li>
          <li><a href="/clientes/">Clientes</a></li>
          <li><a href="/blog/">Blog</a></li>
          <li><a href="/contato/">Contato</a></li>
        </ul>
      </div>
    </nav>
    <div class="footer__contato">
      <a class="footer__contato-item" href="https://wa.me/5511991961322?text=Ol%C3%A1%21%20Gostaria%20de%20um%20or%C3%A7amento%20para%20portas%20corta-fogo." target="_blank" rel="noopener">${WA} (11) 99196-1322</a>
      <a class="footer__contato-item" href="tel:+551149631153">(11) 4963-1153</a>
      <a class="footer__contato-item" href="mailto:contato@apoiocortafogo.com">contato@apoiocortafogo.com</a>
    </div>
    <p class="footer__legal">CNPJ 19.648.928/0001-05 · © <span id="year">2026</span> ${MARCA}. Todos os direitos reservados.</p>
  </div>
</footer>

<a class="wa-float" id="waFloat" data-placement="floating_button" aria-label="Solicitar orçamento pelo WhatsApp" href="${WA_URL}" target="_blank" rel="noopener">
  ${WA}
  <span>Solicitar orçamento</span>
</a>

<script src="/js/tracking.js" defer></script>
<script src="/js/main.js" defer></script>`;

const TRUST = `  <section class="stats" aria-label="Diferenciais">
    <div class="container">
      <ul class="stats__grid">
        <li class="stats__item" data-reveal><strong class="stats__value">Mais de 15 anos</strong> <span class="stats__label">de experiência</span></li>
        <li class="stats__item" data-reveal><strong class="stats__value">Visita técnica gratuita</strong> <span class="stats__label">para avaliação</span></li>
        <li class="stats__item" data-reveal><strong class="stats__value">6 meses</strong> <span class="stats__label">de garantia nos serviços</span></li>
      </ul>
    </div>
  </section>`;

const head = ({ titulo, descricao, url, tipo, jsonld, ogImage, robots, extra = '', cssExtra = '' }) => `<!DOCTYPE html>
<html lang="pt-BR" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  'ad_storage': 'granted', 'ad_user_data': 'granted', 'ad_personalization': 'granted', 'analytics_storage': 'granted'
});
</script>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-K8R63HL');</script>
<!-- End Google Tag Manager -->
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${robots || 'index,follow,max-image-preview:large,max-snippet:-1'}">
<meta name="theme-color" content="#1A1D21">
<meta name="geo.region" content="BR-SP">
<meta name="geo.placename" content="São Paulo">
<meta property="og:type" content="${tipo}">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${MARCA}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${extra}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(descricao)}">
<meta name="twitter:image" content="${ogImage}">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/figtree-latin-400-normal.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/assets/fonts/figtree-latin-500-normal.woff2" crossorigin>
<link rel="stylesheet" href="/css/styles.css">
<link rel="stylesheet" href="/css/blog.css">
${cssExtra}<script>document.documentElement.classList.remove('no-js');</script>
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 1)}
</script>
<!-- FirstOnAI Analytics -->
<script async src="https://app-hmg.firstonai.com.br/v1/analytics.js?key=foa_pk_eee39e200e5074d67421af41da327ccc"></script>
</head>
<body>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K8R63HL" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
<a class="skip-link" href="#main">Pular para o conteúdo</a>
`;

/* ---------- Parsing do Markdown ---------- */
function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const fmText = m ? m[1] : '';
  const body = raw.slice(m ? m[0].length : 0);
  const fm = {};
  let key = null;
  for (const line of fmText.split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && key) { (fm[key] = Array.isArray(fm[key]) ? fm[key] : []).push(unquote(item[1])); continue; }
    const kv = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      if (kv[2] === '') fm[key] = [];              // início de lista
      else { fm[key] = unquote(kv[2]); key = null; }
    }
  }
  return { fm, body };
}
const unquote = (s) => s.replace(/^"([\s\S]*)"$/, '$1').trim();

function inline(text) {
  let s = esc(text);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) => `<a href="${u}">${t}</a>`);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return s;
}

/** Divide o corpo em blocos separados por linha em branco. */
function blocos(body) {
  const out = [];
  let buf = [];
  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    if (line.trim() === '') { if (buf.length) { out.push(buf); buf = []; } }
    else buf.push(line);
  }
  if (buf.length) out.push(buf);
  return out;
}

/** Um título (## ou ###) pode vir colado ao corpo no mesmo bloco (sem linha em
 * branco). Separa o título numa linha e o restante em outro bloco. */
function expandirTitulos(bs) {
  const out = [];
  for (const b of bs) {
    if (/^#{2,3}\s+/.test(b[0]) && b.length > 1) { out.push([b[0]]); out.push(b.slice(1)); }
    else out.push(b);
  }
  return out;
}

function ehComentario(b) { return b.join('\n').trim().startsWith('<!--'); }
function renderBloco(b) {
  if (b.every(l => /^\d+\.\s/.test(l))) return `<ol>${b.map(l => `<li>${inline(l.replace(/^\d+\.\s/, ''))}</li>`).join('')}</ol>`;
  if (b.every(l => /^-\s/.test(l))) return `<ul>${b.map(l => `<li>${inline(l.replace(/^-\s/, ''))}</li>`).join('')}</ul>`;
  return `<p>${inline(b.join(' '))}</p>`;
}

/** Retorna { lead, corpoHtml, faq:[{q,aHtml,aText}], palavras } */
function parseCorpo(body) {
  const bs = expandirTitulos(blocos(body));
  let lead = '';
  const introExtra = [];
  const secoes = [];       // { h2, itens:[html] }
  const faq = [];
  let cur = null;          // seção atual (não-FAQ)
  let emFaq = false;
  let pendingQ = null;
  let contagem = [];

  for (const b of bs) {
    const head0 = b[0];
    if (/^##\s+/.test(head0) && !/^###/.test(head0)) {
      const titulo = head0.replace(/^##\s+/, '').trim();
      if (/^perguntas frequentes$/i.test(titulo)) { emFaq = true; cur = null; continue; }
      emFaq = false; cur = { h2: titulo, itens: [] }; secoes.push(cur);
      contagem.push(titulo);
      continue;
    }
    if (/^###\s+/.test(head0)) { pendingQ = head0.replace(/^###\s+/, '').trim(); continue; }
    if (ehComentario(b)) continue;                     // seção com dado pendente: não renderiza
    contagem.push(b.join(' '));
    if (emFaq && pendingQ) { faq.push({ q: pendingQ, aHtml: inline(b.join(' ')), aText: b.join(' ') }); pendingQ = null; continue; }
    const html = renderBloco(b);
    if (cur) cur.itens.push(html);
    else if (!lead) lead = inline(b.join(' '));         // primeiro parágrafo = lead do hero
    else introExtra.push(html);
  }

  // remove seções que ficaram vazias (só tinham comentário de dado pendente)
  const cheias = secoes.filter(s => s.itens.length);
  const corpoHtml = [
    ...introExtra,
    ...cheias.map(s => `<h2 data-reveal>${inline(s.h2)}</h2>\n${s.itens.join('\n')}`),
  ].join('\n');

  const palavras = contagem.join(' ').split(/\s+/).filter(Boolean).length
    + faq.reduce((n, f) => n + (f.q + ' ' + f.aText).split(/\s+/).length, 0);
  return { lead, corpoHtml, faq, palavras };
}

/* ---------- Schema ---------- */
function breadcrumb(fm, url) {
  const itens = [{ '@type': 'ListItem', position: 1, name: 'Início', item: SITE + '/' }];
  const L = fm.layout;
  let pos = 2;
  if (L === 'produto') { itens.push({ '@type': 'ListItem', position: pos++, name: 'Produtos', item: SITE + '/produtos/' }); }
  else if (L === 'servico' || L === 'servico-local' || L === 'segmento') { itens.push({ '@type': 'ListItem', position: pos++, name: 'Serviços', item: SITE + '/servicos/' }); }
  else if (L === 'blog') { itens.push({ '@type': 'ListItem', position: pos++, name: 'Blog', item: SITE + '/blog/' }); }
  itens.push({ '@type': 'ListItem', position: pos, name: fm.h1, item: url });
  return { '@type': 'BreadcrumbList', itemListElement: itens };
}

function schemaFor(fm, url, faq) {
  const s = fm.schema || '';
  const g = [];
  if (/\bService\b/.test(s)) g.push({ '@type': 'Service', name: fm.h1, serviceType: fm.keyword_principal || fm.h1, description: fm.description, areaServed: { '@type': 'City', name: 'São Paulo' }, provider: { '@id': SITE + '/#business' } });
  if (/\bProduct\b/.test(s)) g.push({ '@type': 'Product', name: fm.h1, description: fm.description, category: 'Porta corta-fogo', brand: { '@type': 'Brand', name: MARCA } });
  if (/\bOrganization\b/.test(s)) g.push({ '@type': 'Organization', '@id': SITE + '/#business', name: MARCA, url: SITE + '/' });
  if (/\bLocalBusiness\b/.test(s)) g.push({ '@type': 'LocalBusiness', '@id': SITE + '/#business', name: MARCA, url: SITE + '/', telephone: '+55 11 99196-1322', email: 'contato@apoiocortafogo.com' });
  if (/\bFAQPage\b/.test(s) && faq.length) g.push({ '@type': 'FAQPage', mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.aText } })) });
  g.push(breadcrumb(fm, url));
  return { '@context': 'https://schema.org', '@graph': g };
}

/* ---------- CTA e FAQ visível ---------- */
function ctaSection(fm) {
  const wa = /whats/i.test(fm.cta_principal || '');
  const label = fm.cta_principal || 'Solicitar orçamento';
  const link = wa
    ? `<a class="btn btn--primary btn--sm" href="${WA_URL}" target="_blank" rel="noopener">${esc(label)} ${ARROW}</a>`
    : `<a class="btn btn--primary btn--sm" href="/#orcamento">${esc(label)} ${ARROW}</a>`;
  return `  <section class="post-cta rail" aria-labelledby="cta-title">
    <div class="post-cta__inner">
      <div>
        <h2 id="cta-title">Precisa de portas corta-fogo em ordem?</h2>
        <p>Visita técnica gratuita para avaliação. Fale com a equipe da Apoio.</p>
        ${link}
      </div>
      <a class="post-cta__phone" data-placement="page_cta" href="${WA_URL}" target="_blank" rel="noopener">${PHONE} (11) 99196-1322</a>
    </div>
  </section>`;
}
function faqVisivel(faq) {
  if (!faq.length) return '';
  return `<h2 data-reveal>Perguntas frequentes</h2>\n` + faq.map(f => `<h3>${inline(f.q)}</h3>\n<p>${f.aHtml}</p>`).join('\n');
}

/* ---------- Rótulo do eyebrow ---------- */
function eyebrow(fm, slug) {
  if (fm.layout === 'institucional') return slug === 'clientes' ? 'Clientes' : 'A empresa';
  if (fm.layout === 'hub') return slug === 'produtos' ? 'Produtos' : 'Serviços';
  if (fm.layout === 'produto') return 'Produtos';
  if (fm.layout === 'segmento') return 'Onde atendemos';
  if (fm.layout === 'contato') return 'Contato';
  return 'Serviços';
}

/* ---------- Página de conteúdo (não-blog) ---------- */
function paginaConteudo(fm, slug, parsed) {
  const url = fm.canonical || `${SITE}${fm.url}`;
  const robots = undefined;   // blocos liberados pelo Paulo (19/09/2026); visor e porta de correr foram removidos
  const corpo = [parsed.corpoHtml, faqVisivel(parsed.faq)].filter(Boolean).join('\n');
  return head({
    titulo: fm.title, descricao: fm.description, url, tipo: 'website',
    ogImage: OG_SITE, robots, jsonld: schemaFor(fm, url, parsed.faq),
  }) + `
${header()}

<main id="main" class="page-top">
  <section class="blog-hero rail" aria-labelledby="page-title">
    <div class="blog-hero__inner">
      <p class="eyebrow">${esc(eyebrow(fm, slug))}</p>
      <h1 id="page-title">${esc(fm.h1)}</h1>
      <p class="lead">${parsed.lead}</p>
    </div>
  </section>
${fm.trust_strip === 'true' ? TRUST + '\n' : ''}
  <section class="post-body rail">
    <article class="post">
${corpo}
    </article>
  </section>

${ctaSection(fm)}
</main>

${footer()}
</body>
</html>
`;
}

/* ---------- Artigo de blog (mesmo visual dos artigos atuais) ---------- */
function paginaBlog(fm, slug, parsed) {
  const url = fm.canonical || `${SITE}${fm.url}`;
  const robots = undefined;   // blocos liberados pelo Paulo (19/09/2026)
  const minutos = Math.max(2, Math.round(parsed.palavras / 180));
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BlogPosting', '@id': url + '#post', mainEntityOfPage: url, headline: fm.title, description: fm.description,
        inLanguage: 'pt-BR', datePublished: HOJE, dateModified: HOJE,
        author: { '@type': 'Organization', name: MARCA, url: SITE + '/' },
        publisher: { '@type': 'Organization', name: MARCA, url: SITE + '/', logo: { '@type': 'ImageObject', url: `${SITE}/assets/img/logo-apoio.png` } },
        image: OG_BLOG },
      ...(parsed.faq.length ? [{ '@type': 'FAQPage', mainEntity: parsed.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.aText } })) }] : []),
      breadcrumb(fm, url),
    ],
  };
  const corpo = [parsed.corpoHtml, faqVisivel(parsed.faq)].filter(Boolean).join('\n');
  return head({
    titulo: fm.title, descricao: fm.description, url, tipo: 'article', ogImage: OG_BLOG, robots, jsonld,
    extra: `<meta property="article:published_time" content="${HOJE}">\n`,
  }) + `
${header()}

<main id="main" class="page-top">
  <section class="post-hero rail" aria-labelledby="post-title">
    <div class="post-hero__inner">
      <p class="eyebrow">Guia técnico</p>
      <h1 id="post-title">${esc(fm.h1)}</h1>
      <p class="post-hero__dek">${esc(fm.description)}</p>
      <p class="post-hero__meta">
        <span><time datetime="${HOJE}">${dataLonga(HOJE)}</time></span>
        <span>${minutos} min de leitura</span>
      </p>
    </div>
    <div class="post-hero__art" aria-hidden="true">
      <img src="/assets/img/blog/desenho-tecnico-porta.webp" alt="" width="1000" height="750" decoding="async">
    </div>
  </section>

  <section class="post-body rail">
    <article class="post">
${corpo}
    </article>
  </section>

  <section class="post-cta rail" aria-labelledby="cta-title">
    <div class="post-cta__inner">
      <div>
        <h2 id="cta-title">Sua porta está fechando como deveria?</h2>
        <p>Nossa equipe realiza avaliação técnica, manutenção e restauração.</p>
        <a class="btn btn--primary btn--sm" href="/#orcamento">Solicitar orçamento ${ARROW}</a>
      </div>
      <a class="post-cta__phone" data-placement="post_cta" href="${WA_URL}" target="_blank" rel="noopener">${PHONE} (11) 99196-1322</a>
    </div>
  </section>
</main>

${footer()}
</body>
</html>
`;
}

/* ---------- Página /produtos/ — catálogo com imagens e filtros ---------- */
const CATALOGO = [
  { cat: 'portas',     rot: 'Portas',           titulo: 'Porta corta-fogo P90',          desc: 'Certificada pela ABNT NBR 11742, com alta resistência e durabilidade. Simples e dupla.', img: 'produto-porta-corta-fogo-p90',        url: '/porta-corta-fogo-p90/' },
  { cat: 'portas',     rot: 'Portas',           titulo: 'Porta corta-fogo P120',         desc: 'Classe superior, para compartimentações de maior risco. Simples e dupla.',               img: 'produto-porta-corta-fogo-p120',       url: '/porta-corta-fogo-p120/' },
  { cat: 'portas',     rot: 'Portas',           titulo: 'Porta corta-fogo dupla',        desc: 'Duas folhas com selecionador, mata-juntas e barra antipânico dupla.',                    img: 'produto-porta-corta-fogo-dupla',      url: '/porta-corta-fogo-dupla/' },
  { cat: 'portas',     rot: 'Componentes',      titulo: 'Batente metálico',              desc: 'Batente para fixação em alvenaria, simples e duplo, para reposição e obra nova.',         img: 'produto-batente-metalico',            url: '/batente-porta-corta-fogo/' },
  { cat: 'barras',     rot: 'Barras antipânico',titulo: 'Barra antipânico',              desc: 'Dispositivo de saída de emergência, simples e dupla, para uma e duas folhas.',           img: 'produto-barra-antipanico',            url: '/barra-antipanico-porta-corta-fogo/' },
  { cat: 'fechaduras', rot: 'Fechaduras',       titulo: 'Fechadura para porta corta-fogo', desc: 'Fechadura de sobrepor e de embutir, com e sem chave, com maçaneta.',                     img: 'produto-fechadura-porta-corta-fogo',  url: '/fechadura-porta-corta-fogo/' },
  { cat: 'fechaduras', rot: 'Fechaduras',       titulo: 'Trinco',                        desc: 'Trinco de sobrepor e de embutir, sem chave, para portas corta-fogo.',                    img: 'produto-trinco-porta-corta-fogo',     url: '/trinco-porta-corta-fogo/' },
  { cat: 'molas',      rot: 'Molas aéreas',     titulo: 'Mola aérea',                    desc: 'Controle o fechamento automático da porta com segurança e precisão. Força 3 e 4.',        img: 'produto-mola-aerea',                  url: '/mola-aerea-porta-corta-fogo/' },
  { cat: 'dobradicas', rot: 'Dobradiças',       titulo: 'Dobradiça para porta corta-fogo', desc: 'Dobradiça reforçada, com mola ou fixa, projetada para uso intenso.',                    img: 'produto-dobradica-porta-corta-fogo',  url: '/dobradica-porta-corta-fogo/' },
  { cat: 'portas',     rot: 'Componentes',      titulo: 'Selecionador de folhas',        desc: 'Faz as duas folhas da porta dupla fecharem na ordem certa.',                             img: 'produto-selecionador-de-folhas',      url: '/selecionador-de-folhas-porta-corta-fogo/' },
];
const FILTROS = [
  { key: 'todos', label: 'Todos' }, { key: 'portas', label: 'Portas' }, { key: 'fechaduras', label: 'Fechaduras' },
  { key: 'barras', label: 'Barras antipânico' }, { key: 'dobradicas', label: 'Dobradiças' }, { key: 'molas', label: 'Molas aéreas' },
];
const ICON_ORIENT = {
  gear: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.63.65 1.12 1.29 1.24"/></svg>',
  doc: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>',
  shield: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
};

// Imagem e rótulo por URL de produto (para o hero das páginas de produto)
const PRODUTO_INFO = {};
CATALOGO.forEach(p => { PRODUTO_INFO[p.url] = { img: p.img, rot: p.rot }; });

// Faixa escura de CTA (planta técnica ao fundo) — usada na /produtos/ e em cada produto
function ctaEscuro() {
  return `  <section class="prod-cta rail" aria-labelledby="cta-title">
    <div class="prod-cta__bg" aria-hidden="true"></div>
    <div class="container prod-cta__inner">
      <div>
        <p class="eyebrow">Atendimento técnico</p>
        <h2 id="cta-title">Peça seu orçamento com a Apoio.</h2>
        <p>Fale com nossa equipe e receba um atendimento ágil e especializado para o seu projeto.</p>
        <div class="prod-cta__actions">
          <a class="btn btn--primary" href="/#orcamento">Solicitar orçamento ${ARROW}</a>
          <a class="prod-cta__phone" href="${WA_URL}" target="_blank" rel="noopener">${PHONE} (11) 99196-1322</a>
        </div>
      </div>
    </div>
  </section>`;
}

// Seção "Escolha com segurança" (orientação técnica) — usada na /produtos/ e em cada produto
function orientacaoTecnica() {
  return `  <section class="prod-orient rail" aria-labelledby="orient-title">
    <div class="prod-orient__img">
      <picture><source srcset="/assets/img/produtos/orientacao-tecnica.webp" type="image/webp"><img src="/assets/img/produtos/orientacao-tecnica.png" alt="Técnico da Apoio avaliando uma porta corta-fogo" width="1536" height="1024" loading="lazy" decoding="async"></picture>
    </div>
    <div class="prod-orient__text">
      <p class="eyebrow">Escolha com segurança</p>
      <h2 id="orient-title">Não sabe qual componente é o correto?</h2>
      <p class="prod-orient__lead">Nossa equipe técnica ajuda você a identificar o produto ideal para o seu tipo de porta, garantindo compatibilidade, segurança e conformidade com as normas.</p>
      <ul class="prod-orient__list">
        <li>${ICON_ORIENT.gear} Orientação técnica especializada</li>
        <li>${ICON_ORIENT.doc} Produtos em conformidade com as normas</li>
        <li>${ICON_ORIENT.shield} Mais segurança para o seu projeto</li>
      </ul>
      <a class="btn btn--primary" href="/#orcamento">Falar com um especialista ${ARROW}</a>
    </div>
  </section>`;
}

// Página de produto: hero escuro (com a imagem do produto) + conteúdo + orientação + CTA escuro
function paginaProduto(fm, slug, parsed) {
  const url = fm.canonical || `${SITE}${fm.url}`;
  const info = PRODUTO_INFO[fm.url] || {};
  const rot = info.rot || 'Produtos';
  const artStyle = info.img ? ` style="background-image:url(/assets/img/produtos/${info.img}.webp)"` : '';
  const corpo = [parsed.corpoHtml, faqVisivel(parsed.faq)].filter(Boolean).join('\n');
  return head({
    titulo: fm.title, descricao: fm.description, url, tipo: 'website', ogImage: OG_SITE,
    jsonld: schemaFor(fm, url, parsed.faq), cssExtra: '<link rel="stylesheet" href="/css/produtos.css">\n',
  }) + `
${header()}

<main id="main" class="page-top prod">
  <section class="prod-hero prod-hero--item rail" aria-labelledby="page-title">
    <div class="container prod-hero__inner">
      <div class="prod-hero__text">
        <p class="eyebrow">${esc(rot)}</p>
        <h1 id="page-title">${esc(fm.h1)}</h1>
        <p class="lead">${esc(fm.description)}</p>
        <a class="btn btn--primary" href="/#orcamento">${WA} Solicitar orçamento</a>
      </div>
    </div>
    <div class="prod-hero__art prod-hero__art--item"${artStyle} aria-hidden="true"></div>
  </section>
${fm.trust_strip === 'true' ? TRUST + '\n' : ''}
  <section class="post-body rail">
    <article class="post">
${corpo}
    </article>
  </section>

${orientacaoTecnica()}

${ctaEscuro()}
</main>

${footer()}
</body>
</html>
`;
}

// Bloco "Solicite uma avaliação" (imagem + WhatsApp + telefone + e-mail) — igual ao da home
function secaoContato() {
  return `  <section class="contact" aria-labelledby="avaliacao-title">
    <div class="contact__media" data-reveal="left">
      <picture>
        <source srcset="/assets/img/cta-porta-detalhe.webp" type="image/webp">
        <img src="/assets/img/cta-porta-detalhe.jpg" alt="Detalhe de porta corta-fogo instalada" width="1280" height="480" loading="lazy" decoding="async">
      </picture>
    </div>
    <div class="contact__band" aria-hidden="true"></div>
    <div class="contact__body" data-reveal>
      <p class="eyebrow">Precisa de instalação ou manutenção?</p>
      <h2 id="avaliacao-title" class="h-section">Solicite uma avaliação para suas portas corta-fogo.</h2>
      <p class="lead">Nossa equipe verifica as condições das portas e indica a solução adequada para seu condomínio ou empresa.</p>
      <div class="contact__actions" data-placement="contact">
        <a class="btn btn--primary" href="https://wa.me/5511991961322?text=Ol%C3%A1%21%20Gostaria%20de%20uma%20avalia%C3%A7%C3%A3o%20para%20portas%20corta-fogo." target="_blank" rel="noopener">${WA} Falar com um especialista</a>
        <div class="contact__details">
          <a class="contact__detail" href="tel:+5511991961322">${PHONE} (11) 99196-1322</a>
          <a class="contact__detail" href="mailto:contato@apoiocortafogo.com"><svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 4h14a1 1 0 0 1 1 1v.4l-8 5-8-5V5a1 1 0 0 1 1-1Zm-1 3.7 8 5 8-5V15a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.7Z"/></svg> contato@apoiocortafogo.com</a>
        </div>
      </div>
    </div>
  </section>`;
}

// Formulário de contato funcional (mesmo da home; o js/main.js o encontra por #quoteForm)
function formularioContato() {
  return `  <section class="quote" id="orcamento" aria-labelledby="orcamento-title">
    <div class="container quote__grid">
      <div data-reveal>
        <p class="eyebrow">Fale com a Apoio</p>
        <h2 id="orcamento-title" class="h-section">Conte um pouco sobre o que você precisa.</h2>
        <p class="lead">Preencha os dados abaixo e nossa equipe entrará em contato.</p>
      </div>

      <form class="quote__form" id="quoteForm" novalidate data-reveal data-endpoint="/api/enviar-email.php" data-whatsapp="5511991961322" method="post">
        <p class="form-status" id="formStatus" role="status" aria-live="polite"></p>
        <div class="field">
          <label class="visually-hidden" for="nome">Seu nome (obrigatório)</label>
          <input type="text" id="nome" name="nome" placeholder="Seu Nome (Obrigatório)" required autocomplete="name" aria-describedby="erro-nome">
          <span class="field__error" id="erro-nome"></span>
        </div>
        <div class="field">
          <label class="visually-hidden" for="email">Seu e-mail (obrigatório)</label>
          <input type="email" id="email" name="email" placeholder="Seu Email (Obrigatório)" required autocomplete="email" aria-describedby="erro-email">
          <span class="field__error" id="erro-email"></span>
        </div>
        <div class="field field--full">
          <label class="visually-hidden" for="assunto">Assunto (obrigatório)</label>
          <input type="text" id="assunto" name="assunto" placeholder="Assunto (Obrigatório)" required aria-describedby="erro-assunto">
          <span class="field__error" id="erro-assunto"></span>
        </div>
        <div class="field field--full">
          <label class="visually-hidden" for="mensagem">Sua mensagem</label>
          <textarea id="mensagem" name="mensagem" placeholder="Sua Mensagem" rows="5" aria-describedby="erro-mensagem"></textarea>
          <span class="field__error" id="erro-mensagem"></span>
        </div>
        <input type="hidden" name="utm_source" value=""><input type="hidden" name="utm_medium" value=""><input type="hidden" name="utm_campaign" value=""><input type="hidden" name="utm_term" value=""><input type="hidden" name="utm_content" value=""><input type="hidden" name="gclid" value=""><input type="hidden" name="gbraid" value=""><input type="hidden" name="wbraid" value=""><input type="hidden" name="attribution_first" value="">
        <div class="field" hidden aria-hidden="true">
          <label for="empresa-hp">Não preencha este campo</label>
          <input type="text" id="empresa-hp" name="empresa_hp" tabindex="-1" autocomplete="off">
        </div>
        <div class="quote__footer">
          <span class="quote__note"><svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 2.5 3.5 5v5c0 4 2.8 6.9 6.5 7.9 3.7-1 6.5-3.9 6.5-7.9V5L10 2.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg> Seus dados serão usados apenas para retornar o contato.</span>
          <button class="btn btn--primary" type="submit">Enviar solicitação ${ARROW}</button>
        </div>
      </form>
    </div>
  </section>`;
}

// Páginas institucionais e contato: hero escuro (planta técnica) + conteúdo + CTA escuro
function paginaEscura(fm, slug, parsed) {
  const url = fm.canonical || `${SITE}${fm.url}`;
  const rot = eyebrow(fm, slug);
  const wa = /whats/i.test(fm.cta_principal || '');
  const ctaLabel = fm.cta_principal || 'Solicitar orçamento';
  const heroCta = wa
    ? `<a class="btn btn--primary" href="${WA_URL}" target="_blank" rel="noopener">${WA} ${esc(ctaLabel)}</a>`
    : `<a class="btn btn--primary" href="/#orcamento">${WA} ${esc(ctaLabel)}</a>`;
  const corpo = [parsed.corpoHtml, faqVisivel(parsed.faq)].filter(Boolean).join('\n');
  return head({
    titulo: fm.title, descricao: fm.description, url, tipo: 'website', ogImage: OG_SITE,
    jsonld: schemaFor(fm, url, parsed.faq), cssExtra: '<link rel="stylesheet" href="/css/produtos.css">\n',
  }) + `
${header()}

<main id="main" class="page-top prod">
  <section class="prod-hero rail" aria-labelledby="page-title">
    <div class="container prod-hero__inner">
      <div class="prod-hero__text">
        <p class="eyebrow">${esc(rot)}</p>
        <h1 id="page-title">${esc(fm.h1)}</h1>
        <p class="lead">${esc(fm.description)}</p>
        ${heroCta}
      </div>
    </div>
    <div class="prod-hero__art" aria-hidden="true"></div>
  </section>
${slug === 'contato' ? secaoContato() + '\n' : ''}${fm.trust_strip === 'true' ? TRUST + '\n' : ''}${slug === 'clientes' ? clientesLogos() + '\n' : ''}${corpo ? `
  <section class="post-body rail">
    <article class="post">
${corpo}
    </article>
  </section>
` : ''}${slug === 'contato' ? '\n' + formularioContato() + '\n' : ''}
${ctaEscuro()}
</main>

${footer()}
</body>
</html>
`;
}

// Grade estática dos 8 logos de clientes já usados na home (fundo claro)
function clientesLogos() {
  const logos = [
    ['03-shopping-patio-paulista', 'Shopping Pátio Paulista'],
    ['06-itau-cultural-e-itau', 'Itaú Cultural e Itaú'],
    ['05-prevent-senior', 'Prevent Senior'],
    ['07-metodo', 'Método'],
    ['02-tv-med', 'TV Med'],
    ['08-mercure', 'Mercure'],
    ['01-masotti', 'Masotti'],
    ['04-adbens-condominios', 'Adbens Condomínios'],
  ];
  return `  <section class="clients-page rail" aria-label="Logos de clientes atendidos">
    <div class="container">
      <ul class="clients-grid">
${logos.map(([f, a]) => `        <li class="clients-grid__item"><img src="/assets/img/clientes/${f}.webp" alt="${esc(a)}" width="169" height="97" loading="lazy" decoding="async"></li>`).join('\n')}
      </ul>
    </div>
  </section>`;
}

function paginaProdutosHub(fm) {
  const url = fm.canonical || `${SITE}${fm.url}`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [breadcrumb(fm, url)] };
  const cards = CATALOGO.map(p => `        <a class="prod-card" data-cat="${p.cat}" href="${p.url}">
          <span class="prod-card__media"><picture><source srcset="/assets/img/produtos/${p.img}.webp" type="image/webp"><img src="/assets/img/produtos/${p.img}.png" alt="${esc(p.titulo)}" width="1254" height="1254" loading="lazy" decoding="async"></picture></span>
          <span class="prod-card__body">
            <span class="eyebrow">${esc(p.rot)}</span>
            <h3>${esc(p.titulo)}</h3>
            <span class="prod-card__desc">${esc(p.desc)}</span>
            <span class="prod-card__cta">Ver produto ${ARROW}</span>
          </span>
        </a>`).join('\n');
  const filtros = FILTROS.map((f, i) => `<button type="button" class="prod-filtro${i === 0 ? ' is-active' : ''}" data-filtro="${f.key}"${i === 0 ? ' aria-pressed="true"' : ' aria-pressed="false"'}>${esc(f.label)}</button>`).join('\n        ');

  return head({
    titulo: fm.title, descricao: fm.description, url, tipo: 'website', ogImage: OG_SITE,
    jsonld, cssExtra: '<link rel="stylesheet" href="/css/produtos.css">\n',
  }) + `
${header()}

<main id="main" class="page-top prod">
  <section class="prod-hero rail" aria-labelledby="prod-title">
    <div class="container prod-hero__inner">
      <div class="prod-hero__text">
        <p class="eyebrow">Produtos para portas corta-fogo</p>
        <h1 id="prod-title">Componentes para instalação, <span class="accent">manutenção e reposição.</span></h1>
        <p class="lead">Produtos selecionados de fabricantes certificados, para garantir segurança, funcionamento e durabilidade.</p>
        <a class="btn btn--primary" href="/#orcamento">${WA} Solicitar orçamento</a>
      </div>
    </div>
    <div class="prod-hero__art" aria-hidden="true"></div>
  </section>

  <section class="prod-cat rail" aria-labelledby="cat-title">
    <div class="container">
      <p class="eyebrow">Nosso catálogo</p>
      <h2 id="cat-title" class="h-section">Tudo o que sua porta corta-fogo precisa.</h2>
      <p class="lead">Nossos produtos são vendidos com orientação técnica para garantir a escolha correta e a total compatibilidade com o seu sistema.</p>
      <div class="prod-filtros" id="prodFiltros" role="group" aria-label="Filtrar produtos">
        ${filtros}
      </div>
      <div class="prod-grid" id="prodGrid">
${cards}
      </div>
    </div>
  </section>

${orientacaoTecnica()}

${ctaEscuro()}
</main>

${footer()}
</body>
</html>
`;
}

/* ---------- Página /servicos/ — hub com grid numerado e ícones ---------- */
// Ícones de linha (48×48, currentColor) — fornecidos em icones.zip, embutidos inline.
const ICON_SERV = {
  instalacao: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 42h28M14 42V7h20v35M19 38V11h15v27"/><circle cx="29" cy="25" r="1"/></svg>',
  manutencao: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M29 8a10 10 0 0 0-11 13L7 32a5 5 0 0 0 7 7l11-11A10 10 0 0 0 38 17l-7 7-7-7 7-7Z"/><path d="m11 35 2 2"/></svg>',
  restauracao: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17 6 16 6-5 13-16-6 5-13Z"/><path d="m17 21-7 19c-1 3 4 5 5 2l8-19"/><path d="m20 9 10 4"/></svg>',
  barra: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="17" width="6" height="18"/><rect x="36" y="17" width="6" height="18"/><path d="M12 22h24v8H12"/></svg>',
  vistoria: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="10" y="9" width="28" height="34" rx="2"/><path d="M18 9V5h12v4M18 27l4 4 9-10M17 16h14"/></svg>',
  adequacao: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 5c5 5 10 7 16 8v10c0 10-6 16-16 21C14 39 8 33 8 23V13c6-1 11-3 16-8Z"/><path d="m17 24 5 5 10-11"/></svg>',
  naofecha: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 42V7h20v35M20 39V11l13 3v25l-13 3Z"/><circle cx="29" cy="26" r="1"/><path d="M5 24h7M7 19h5M7 29h5"/></svg>',
  condenada: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 42h24M9 42V7h20v23M14 38V11h15v19"/><path d="m35 25 10 18H25l10-18Z"/><path d="M35 31v5M35 39v.5"/></svg>',
  visita: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 43v-6c0-6 5-10 11-10h4c4 0 7 2 9 5M12 14a8 8 0 0 1 16 0v5a8 8 0 0 1-16 0v-5Z"/><path d="M10 14h20M15 6v8M25 6v8"/><rect x="29" y="27" width="14" height="17" rx="1"/><path d="M33 32h6M33 36h6M33 40h4"/></svg>',
  empresa: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 43h38M10 43V22h10v21M20 43V7h18v36"/><path d="M25 13h3M32 13h2M25 19h3M32 19h2M25 25h3M32 25h2M25 31h3M32 31h2M14 28h2M14 34h2"/><path d="M27 43v-6h5v6"/></svg>',
};
const SERVICOS = [
  { n: '01', icon: 'instalacao',  t: 'Instalação de porta corta-fogo',            d: 'Equipe técnica especializada para uma instalação segura e conforme as normas.',       u: '/instalacao-de-porta-corta-fogo/' },
  { n: '02', icon: 'manutencao',  t: 'Manutenção de porta corta-fogo',            d: 'Manutenção preventiva e corretiva para garantir o pleno funcionamento.',              u: '/manutencao-de-porta-corta-fogo/' },
  { n: '03', icon: 'restauracao', t: 'Restauração de porta corta-fogo',           d: 'Recuperação de portas danificadas, prolongando sua vida útil e segurança.',           u: '/restauracao-de-porta-corta-fogo/' },
  { n: '04', icon: 'barra',       t: 'Barra antipânico',                          d: 'Instalação, ajuste e manutenção do dispositivo de saída de emergência.',              u: '/barra-antipanico/' },
  { n: '05', icon: 'vistoria',    t: 'Vistoria de porta corta-fogo para AVCB',    d: 'Inspeção técnica completa com laudo e orientações para o seu AVCB.',                   u: '/vistoria-porta-corta-fogo-avcb/' },
  { n: '06', icon: 'adequacao',   t: 'Adequação de porta corta-fogo para AVCB',   d: 'Ajustes e adequações para atendimento aos requisitos do Corpo de Bombeiros.',         u: '/adequacao-porta-corta-fogo-avcb/' },
  { n: '07', icon: 'naofecha',    t: 'Porta corta-fogo não fecha',                d: 'Diagnosticamos a causa e realizamos o reparo adequado.',                              u: '/porta-corta-fogo-nao-fecha/' },
  { n: '08', icon: 'condenada',   t: 'Porta corta-fogo condenada',                d: 'Avaliação técnica e orientações para substituição segura e conforme a norma.',        u: '/porta-corta-fogo-condenada/' },
  { n: '09', icon: 'visita',      t: 'Visita técnica',                            d: 'Atendimento no local com análise especializada e orientações objetivas.',             u: '/visita-tecnica/' },
  { n: '10', icon: 'empresa',     t: 'Empresa de porta corta-fogo em SP',         d: 'Mais de 15 anos de experiência em São Paulo e região.',                               u: '/empresa-de-porta-corta-fogo-sp/' },
];

// Seção "Escolha com segurança" — variante para serviços
function orientacaoServicos() {
  return `  <section class="prod-orient rail" aria-labelledby="orient-title">
    <div class="prod-orient__img">
      <picture><source srcset="/assets/img/produtos/orientacao-tecnica.webp" type="image/webp"><img src="/assets/img/produtos/orientacao-tecnica.png" alt="Técnico da Apoio avaliando uma porta corta-fogo" width="1536" height="1024" loading="lazy" decoding="async"></picture>
    </div>
    <div class="prod-orient__text">
      <p class="eyebrow">Atendimento com segurança</p>
      <h2 id="orient-title">Não sabe qual serviço você precisa?</h2>
      <p class="prod-orient__lead">Nossa equipe faz a avaliação técnica e indica a solução adequada para a sua porta, com orientação clara e conformidade com as normas.</p>
      <ul class="prod-orient__list">
        <li>${ICON_ORIENT.gear} Avaliação técnica especializada</li>
        <li>${ICON_ORIENT.doc} Serviços em conformidade com as normas</li>
        <li>${ICON_ORIENT.shield} Mais segurança para o seu projeto</li>
      </ul>
      <a class="btn btn--primary" href="/#orcamento">Falar com um especialista ${ARROW}</a>
    </div>
  </section>`;
}

function paginaServicosHub(fm) {
  const url = fm.canonical || `${SITE}${fm.url}`;
  const jsonld = { '@context': 'https://schema.org', '@graph': [breadcrumb(fm, url)] };
  const cards = SERVICOS.map(s => `        <a class="serv-item" href="${s.u}">
          <span class="serv-item__num">${s.n}</span>
          <span class="serv-item__icon">${ICON_SERV[s.icon]}</span>
          <span class="serv-item__body">
            <h3>${esc(s.t)}</h3>
            <span class="serv-item__desc">${esc(s.d)}</span>
            <span class="serv-item__cta">Saiba mais ${ARROW}</span>
          </span>
        </a>`).join('\n');

  return head({
    titulo: fm.title, descricao: fm.description, url, tipo: 'website', ogImage: OG_SITE,
    jsonld, cssExtra: '<link rel="stylesheet" href="/css/produtos.css">\n',
  }) + `
${header()}

<main id="main" class="page-top prod serv">
  <section class="prod-hero rail" aria-labelledby="serv-title">
    <div class="container prod-hero__inner">
      <div class="prod-hero__text">
        <p class="eyebrow">Serviços para portas corta-fogo</p>
        <h1 id="serv-title">Instalação, manutenção e <span class="accent">restauração completa.</span></h1>
        <p class="lead">Uma empresa que faz só isso há mais de 15 anos. Escolha o serviço ou fale conosco para uma visita técnica gratuita.</p>
        <a class="btn btn--primary" href="/#orcamento">${WA} Solicitar orçamento</a>
      </div>
    </div>
    <div class="prod-hero__art" aria-hidden="true"></div>
  </section>

  <section class="serv-cat rail" aria-labelledby="serv-cat-title">
    <div class="container">
      <p class="eyebrow">Nossos serviços</p>
      <h2 id="serv-cat-title" class="h-section">Tudo o que sua porta corta-fogo precisa.</h2>
      <p class="lead">Atuamos com avaliação técnica, orientação clara e execução responsável, sempre em conformidade com as normas vigentes.</p>
      <div class="serv-list">
${cards}
      </div>
    </div>
  </section>

${orientacaoServicos()}

${ctaEscuro()}
</main>

${footer()}
</body>
</html>
`;
}

// Página de serviço / serviço local / segmento: hero escuro + conteúdo + orientação + CTA escuro
function paginaServico(fm, slug, parsed) {
  const url = fm.canonical || `${SITE}${fm.url}`;
  const wa = /whats/i.test(fm.cta_principal || '');
  const label = fm.cta_principal || 'Solicitar orçamento';
  const heroCta = wa
    ? `<a class="btn btn--primary" href="${WA_URL}" target="_blank" rel="noopener">${WA} ${esc(label)}</a>`
    : `<a class="btn btn--primary" href="/#orcamento">${WA} ${esc(label)}</a>`;
  const corpo = [parsed.corpoHtml, faqVisivel(parsed.faq)].filter(Boolean).join('\n');
  return head({
    titulo: fm.title, descricao: fm.description, url, tipo: 'website', ogImage: OG_SITE,
    jsonld: schemaFor(fm, url, parsed.faq), cssExtra: '<link rel="stylesheet" href="/css/produtos.css">\n',
  }) + `
${header()}

<main id="main" class="page-top prod serv">
  <section class="prod-hero rail" aria-labelledby="page-title">
    <div class="container prod-hero__inner">
      <div class="prod-hero__text">
        <p class="eyebrow">${esc(eyebrow(fm, slug))}</p>
        <h1 id="page-title">${esc(fm.h1)}</h1>
        <p class="lead">${parsed.lead || esc(fm.description)}</p>
        ${heroCta}
      </div>
    </div>
    <div class="prod-hero__art" aria-hidden="true"></div>
  </section>
${fm.trust_strip === 'true' ? TRUST + '\n' : ''}
  <section class="post-body rail">
    <article class="post">
${corpo}
    </article>
  </section>

${orientacaoServicos()}

${ctaEscuro()}
</main>

${footer()}
</body>
</html>
`;
}

/* ---------- Geração ---------- */
const dir = resolve(ROOT, 'conteudo/paginas');
const arquivos = readdirSync(dir).filter(f => f.endsWith('.md'));
let nConteudo = 0, nBlog = 0;
const blogNovos = [];   // artigos vindos do material (para entrar na listagem do blog)

for (const arq of arquivos) {
  const { fm, body } = parseFrontmatter(readFileSync(join(dir, arq), 'utf8'));
  if (!fm.url || !fm.layout) { console.log(`  ! ignorado (sem url/layout): ${arq}`); continue; }
  const slug = fm.url.replace(/^\/|\/$/g, '');           // ex.: "instalacao-de-porta-corta-fogo" ou "blog/comprar-..."
  const parsed = parseCorpo(body);
  const html = fm.layout === 'blog' ? paginaBlog(fm, slug, parsed)
    : slug === 'produtos' ? paginaProdutosHub(fm)
    : slug === 'servicos' ? paginaServicosHub(fm)
    : fm.layout === 'produto' ? paginaProduto(fm, slug, parsed)
    : (fm.layout === 'servico' || fm.layout === 'servico-local' || fm.layout === 'segmento') ? paginaServico(fm, slug, parsed)
    : (fm.layout === 'institucional' || fm.layout === 'contato') ? paginaEscura(fm, slug, parsed)
    : paginaConteudo(fm, slug, parsed);
  const outDir = resolve(ROOT, slug);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), html);
  if (fm.layout === 'blog') {
    nBlog++;
    blogNovos.push({ slug: slug.replace(/^blog\//, ''), titulo: fm.h1, descricao: fm.description, data: HOJE, categoria: 'Guia técnico', minutos: Math.max(2, Math.round(parsed.palavras / 180)) });
  } else nConteudo++;
}
console.log(`  ✓ ${nConteudo} páginas de conteúdo + ${nBlog} artigos de blog`);

/* ---------- Listagem do blog: 12 artigos existentes (artigos.json) + os novos ---------- */
const palavrasArtigo = (a) => a.secoes.flatMap(s => s.blocos).reduce((n, b) => n + (b.texto || (b.itens ? b.itens.join(' ') : '')).split(/\s+/).filter(Boolean).length, 0)
  + a.faq.reduce((n, f) => n + (f.q + ' ' + f.a).split(/\s+/).length, 0) + (a.cta ? a.cta.split(/\s+/).length : 0);
const artigos = JSON.parse(readFileSync(resolve(ROOT, 'conteudo/blog/artigos.json'), 'utf8'))
  .map(a => ({ slug: a.slug, titulo: a.titulo, descricao: a.descricao, data: a.data, categoria: a.categoria, minutos: Math.max(2, Math.round(palavrasArtigo(a) / 180)) }));
const todosPosts = [...blogNovos, ...artigos].sort((a, b) => b.data.localeCompare(a.data) || a.titulo.localeCompare(b.titulo));

const blogUrl = `${SITE}/blog/`;
const blogJsonld = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Blog', '@id': blogUrl + '#blog', url: blogUrl, name: `Blog ${MARCA}`, inLanguage: 'pt-BR',
      description: 'Guias técnicos sobre portas corta-fogo: funcionamento, manutenção, normas e responsabilidades.',
      publisher: { '@type': 'Organization', name: MARCA, url: SITE + '/' },
      blogPost: todosPosts.map(a => ({ '@type': 'BlogPosting', headline: a.titulo, url: `${SITE}/blog/${a.slug}/`, datePublished: a.data })) },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: blogUrl } ] },
  ],
};
const blogCards = todosPosts.map(a => `        <a class="card" data-reveal href="/blog/${a.slug}/">
          <p class="eyebrow">${esc(a.categoria)}</p>
          <h2>${esc(a.titulo)}</h2>
          <p>${esc(a.descricao)}</p>
          <p class="card__meta"><span><time datetime="${a.data}">${dataLonga(a.data)}</time></span><span>${a.minutos} min de leitura</span></p>
        </a>`).join('\n');
const blogIndexHtml = head({
  titulo: `Blog: guias sobre portas corta-fogo | ${MARCA}`,
  descricao: 'Guias técnicos sobre portas corta-fogo: como funcionam, quando fazer manutenção, normas em São Paulo e responsabilidades do síndico.',
  url: blogUrl, tipo: 'website', ogImage: OG_BLOG, jsonld: blogJsonld,
}) + `
${header()}

<main id="main" class="page-top">
  <section class="blog-hero rail" aria-labelledby="blog-title">
    <div class="blog-hero__inner">
      <p class="eyebrow">Blog</p>
      <h1 id="blog-title">Guias técnicos sobre portas corta-fogo.</h1>
      <p class="lead">Funcionamento, manutenção, normas e responsabilidades, explicados para síndicos, gestores e empresas em São Paulo.</p>
    </div>
    <div class="post-hero__art" aria-hidden="true">
      <img src="/assets/img/blog/desenho-tecnico-porta.webp" alt="" width="1000" height="750" decoding="async">
    </div>
  </section>

  <section class="blog-list rail" aria-label="Artigos">
    <div class="blog-grid">
${blogCards}
    </div>
  </section>
</main>

${footer()}
</body>
</html>
`;
writeFileSync(resolve(ROOT, 'blog', 'index.html'), blogIndexHtml);
console.log(`  ✓ blog/index.html (${todosPosts.length} artigos na listagem)`);

/* ---------- Sitemap: varre TUDO que foi gerado, fora as noindex e o 404 ---------- */
const attr = (t, n) => (t.match(new RegExp(`\\s${n}=(?:"([^"]*)"|'([^']*)')`)) || [])[1];
const paginas = ['index.html', ...globSync('*/index.html', { cwd: ROOT }), ...globSync('blog/**/index.html', { cwd: ROOT })]
  .map(p => p.split('\\').join('/'));
const vistos = new Set();
const urls = [];
for (const p of paginas) {
  if (vistos.has(p)) continue; vistos.add(p);
  const h = readFileSync(join(ROOT, p), 'utf8');
  const robots = (h.match(/<meta\s+name="robots"\s+content="([^"]*)"/) || [])[1] || '';
  if (/noindex/.test(robots)) continue;
  const rel = p === 'index.html' ? '' : p.replace(/index\.html$/, '');
  const loc = SITE + '/' + rel;
  const prio = rel === '' ? '1.0' : /^blog\//.test(rel) ? '0.7' : rel === 'servicos/' || rel === 'produtos/' ? '0.9' : '0.8';
  const freq = rel === '' || /^blog\//.test(rel) ? 'monthly' : 'monthly';
  urls.push({ loc, prio, freq });
}
urls.sort((a, b) => (b.prio.localeCompare(a.prio)) || a.loc.localeCompare(b.loc));
writeFileSync(resolve(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${HOJE}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.prio}</priority>
  </url>`).join('\n')}
</urlset>
`);
console.log(`  ✓ sitemap.xml (${urls.length} URLs)`);
