/**
 * Gera as páginas do blog a partir de conteudo/blog/artigos.json.
 *   npm run blog
 *
 * Saída:
 *   blog/index.html                 listagem
 *   blog/<slug>/index.html          um por artigo (URL /blog/<slug>/)
 *   sitemap.xml                     home + blog + artigos
 *
 * Para editar um texto, altere o JSON e rode o script de novo. As páginas
 * geradas são commitadas: o site continua sem etapa de build no deploy.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://apoiocortafogo.com';
const MARCA = 'Apoio Corta Fogo';
const artigos = JSON.parse(readFileSync(resolve(ROOT, 'conteudo/blog/artigos.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const dataLonga = (iso) => { const [a, m, d] = iso.split('-'); return `${parseInt(d, 10)} de ${MESES[parseInt(m, 10) - 1]} de ${a}`; };
const palavras = (a) => a.secoes.flatMap(s => s.blocos).reduce((n, b) => n + (b.texto || b.itens?.join(' ') || '').split(/\s+/).length, 0)
  + a.faq.reduce((n, f) => n + (f.q + ' ' + f.a).split(/\s+/).length, 0) + a.cta.split(/\s+/).length;
const minutos = (a) => Math.max(2, Math.round(palavras(a) / 180));

/* ---------- Ícones ---------- */
const ARROW = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.5 8h11m0 0L9.5 4m4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW_NE = '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 12L12 4M12 4H6M12 4v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PHONE = '<svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M17.5 14.1v2.4a1.6 1.6 0 0 1-1.8 1.6 15.9 15.9 0 0 1-6.9-2.5 15.6 15.6 0 0 1-4.8-4.8A15.9 15.9 0 0 1 1.5 3.8 1.6 1.6 0 0 1 3.1 2h2.4a1.6 1.6 0 0 1 1.6 1.4c.1.8.3 1.5.6 2.2a1.6 1.6 0 0 1-.4 1.7l-1 1a12.8 12.8 0 0 0 4.8 4.8l1-1a1.6 1.6 0 0 1 1.7-.4c.7.3 1.4.5 2.2.6a1.6 1.6 0 0 1 1.5 1.8Z"/></svg>';
const WA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23a8.2 8.2 0 0 1 5.82 2.41 8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.71-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.06 0 1.22.89 2.39 1.01 2.56.12.16 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z"/></svg>';

/* ---------- Partes comuns (mesmo cabeçalho e rodapé da home, com links absolutos) ---------- */
const LOGO = (lazy) => `<picture>
        <source srcset="/assets/img/logo-apoio.webp" type="image/webp">
        <img src="/assets/img/logo-apoio.png" alt="${MARCA} — Instalação e Manutenção de Portas Corta-Fogo" width="291" height="117"${lazy ? ' loading="lazy"' : ''}>
      </picture>`;
const NAV = (cls) => `<a class="${cls}" href="/#servicos">Serviços</a>
      <a class="${cls}" href="/#produtos">Produtos</a>
      <a class="${cls}" href="/#empresa">A empresa</a>
      <a class="${cls}" href="/#clientes">Clientes</a>
      <a class="${cls}" href="/blog/" aria-current="true">Blog</a>`;

const header = () => `<header class="header rail" id="header">
  <div class="container header__inner">
    <a class="logo" href="/" aria-label="${MARCA} — página inicial">
      ${LOGO(false)}
    </a>
    <nav class="nav" id="nav" aria-label="Navegação principal">
      ${NAV('nav__link')}
      <a class="btn btn--primary btn--sm" href="/#orcamento">Solicitar avaliação ${ARROW_NE}</a>
    </nav>
    <a class="btn btn--primary btn--sm header__cta" href="/#orcamento">Solicitar avaliação ${ARROW_NE}</a>
    <button class="nav-toggle" id="navToggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Abrir menu"><span></span></button>
  </div>
</header>`;

const footer = () => `<footer class="footer rail">
  <div class="container footer__inner">
    <a class="logo" href="/" aria-label="${MARCA} — página inicial">
      ${LOGO(true)}
    </a>
    <nav class="footer__nav" aria-label="Navegação do rodapé">
      ${NAV('')}
    </nav>
    <p class="footer__legal">© <span id="year">2026</span> ${MARCA}.<br>Todos os direitos reservados.</p>
  </div>
</footer>

<a class="wa-float" id="waFloat" href="https://wa.me/5511991961322?text=Ol%C3%A1%21%20Gostaria%20de%20um%20or%C3%A7amento%20para%20portas%20corta-fogo." target="_blank" rel="noopener">
  ${WA}
  <span>Solicitar orçamento</span>
</a>

<script src="/js/main.js" defer></script>`;

const head = ({ titulo, descricao, url, tipo, jsonld, extra = '' }) => `<!DOCTYPE html>
<html lang="pt-BR" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<meta name="theme-color" content="#1A1D21">
<meta property="og:type" content="${tipo}">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${MARCA}">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:image" content="${SITE}/assets/img/blog/og-blog.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
${extra}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titulo)}">
<meta name="twitter:description" content="${esc(descricao)}">
<meta name="twitter:image" content="${SITE}/assets/img/blog/og-blog.jpg">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/css/styles.css">
<link rel="stylesheet" href="/css/blog.css">
<script>document.documentElement.classList.remove('no-js');</script>
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 1)}
</script>
</head>
<body>
<a class="skip-link" href="#main">Pular para o conteúdo</a>
`;

/* ---------- Corpo do artigo ---------- */
function bloco(b) {
  if (b.tipo === 'p') return `<p>${esc(b.texto)}</p>`;
  const tag = b.tipo === 'ol' ? 'ol' : 'ul';
  return `<${tag}>${b.itens.map(i => `<li>${esc(i)}</li>`).join('')}</${tag}>`;
}

function corpo(a) {
  const img = a.imagem;
  const figura = `<figure>
  <picture>
    <source srcset="/assets/img/blog/${img.arquivo}.webp" type="image/webp">
    <img src="/assets/img/blog/${img.arquivo}.jpg" alt="${esc(img.alt)}" width="1200" height="900" loading="lazy" decoding="async">
  </picture>
  <figcaption>${esc(img.legenda)}</figcaption>
</figure>`;
  const citacao = `<blockquote><p>“${esc(a.citacao)}”</p></blockquote>`;

  const partes = [];
  a.secoes.forEach((s, i) => {
    partes.push(`<h2>${esc(s.h2)}</h2>`);
    partes.push(...s.blocos.map(bloco));
    if (i === 0) partes.push(figura);          // depois da primeira seção, como no layout
    if (i === 1) partes.push(citacao);         // depois da segunda
  });
  partes.push(`<p>${esc(a.cta)}</p>`);

  if (a.faq.length) {
    partes.push('<h2>Perguntas frequentes</h2>');
    a.faq.forEach(f => partes.push(`<h3>${esc(f.q)}</h3>`, `<p>${esc(f.a)}</p>`));
  }
  if (a.referencias.length) {
    partes.push(`<div class="post__refs"><h2>Referências para revisão técnica</h2><ul>${
      a.referencias.map(r => `<li>${r.url ? `<a href="${r.url}" rel="noopener" target="_blank">${esc(r.titulo)}</a>` : esc(r.titulo)}</li>`).join('')
    }</ul></div>`);
  }
  return partes.join('\n');
}

function paginaArtigo(a) {
  const url = `${SITE}/blog/${a.slug}/`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting', '@id': url + '#post', mainEntityOfPage: url,
        headline: a.titulo, description: a.descricao, inLanguage: 'pt-BR',
        datePublished: a.data, dateModified: a.atualizado,
        wordCount: palavras(a), keywords: [a.palavra_chave, ...a.palavras_secundarias].join(', '),
        image: `${SITE}/assets/img/blog/og-blog.jpg`,
        author: { '@type': 'Organization', name: MARCA, url: SITE + '/' },
        publisher: { '@type': 'Organization', name: MARCA, url: SITE + '/', logo: { '@type': 'ImageObject', url: `${SITE}/assets/img/logo-apoio.png` } },
      },
      {
        '@type': 'FAQPage',
        mainEntity: a.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE + '/blog/' },
          { '@type': 'ListItem', position: 3, name: a.titulo, item: url },
        ],
      },
    ],
  };

  return head({
    titulo: `${a.titulo} | ${MARCA}`, descricao: a.descricao, url, tipo: 'article', jsonld,
    extra: `<meta property="article:published_time" content="${a.data}">\n<meta property="article:modified_time" content="${a.atualizado}">\n`,
  }) + `
${header()}

<main id="main" class="page-top">
  <section class="post-hero rail" aria-labelledby="post-title">
    <div class="post-hero__inner">
      <p class="eyebrow">${esc(a.categoria)}</p>
      <h1 id="post-title">${esc(a.titulo)}</h1>
      <p class="post-hero__dek">${esc(a.descricao)}</p>
      <p class="post-hero__meta">
        <span><time datetime="${a.data}">${dataLonga(a.data)}</time></span>
        <span>${minutos(a)} min de leitura</span>
      </p>
    </div>
    <div class="post-hero__art" aria-hidden="true">
      <img src="/assets/img/blog/desenho-tecnico-porta.webp" alt="" width="1000" height="750" decoding="async">
    </div>
  </section>

  <section class="post-body rail">
    <article class="post">
${corpo(a)}
    </article>
  </section>

  <section class="post-cta rail" aria-labelledby="cta-title">
    <div class="post-cta__inner">
      <div>
        <h2 id="cta-title">Sua porta está fechando como deveria?</h2>
        <p>Nossa equipe realiza avaliação técnica, manutenção e restauração.</p>
        <a class="btn btn--primary btn--sm" href="/#orcamento">Solicitar avaliação ${ARROW}</a>
      </div>
      <a class="post-cta__phone" href="tel:+5511991961322">${PHONE} (11) 99196-1322</a>
    </div>
  </section>
</main>

${footer()}
</body>
</html>
`;
}

/* ---------- Listagem ---------- */
function paginaLista() {
  const url = `${SITE}/blog/`;
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Blog', '@id': url + '#blog', url, name: `Blog ${MARCA}`, inLanguage: 'pt-BR',
        description: 'Guias técnicos sobre portas corta-fogo: funcionamento, manutenção, normas e responsabilidades.',
        publisher: { '@type': 'Organization', name: MARCA, url: SITE + '/' },
        blogPost: artigos.map(a => ({ '@type': 'BlogPosting', headline: a.titulo, url: `${SITE}/blog/${a.slug}/`, datePublished: a.data })) },
      { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: url } ] },
    ],
  };
  const cards = artigos.map(a => `        <a class="card" href="/blog/${a.slug}/">
          <p class="eyebrow">${esc(a.categoria)}</p>
          <h2>${esc(a.titulo)}</h2>
          <p>${esc(a.descricao)}</p>
          <p class="card__meta"><span><time datetime="${a.data}">${dataLonga(a.data)}</time></span><span>${minutos(a)} min de leitura</span></p>
        </a>`).join('\n');

  return head({
    titulo: `Blog: guias sobre portas corta-fogo | ${MARCA}`,
    descricao: 'Guias técnicos sobre portas corta-fogo: como funcionam, quando fazer manutenção, normas em São Paulo e responsabilidades do síndico.',
    url, tipo: 'website', jsonld,
  }) + `
${header()}

<main id="main" class="page-top">
  <section class="blog-hero rail" aria-labelledby="blog-title">
    <div class="blog-hero__inner">
      <p class="eyebrow">Blog</p>
      <h1 id="blog-title">Guias técnicos sobre portas corta-fogo.</h1>
      <p class="lead">Funcionamento, manutenção, normas e responsabilidades, explicados para síndicos, gestores e empresas em São Paulo.</p>
    </div>
  </section>

  <section class="blog-list rail" aria-label="Artigos">
    <div class="blog-grid">
${cards}
    </div>
  </section>
</main>

${footer()}
</body>
</html>
`;
}

/* ---------- Escrita ---------- */
const outDir = resolve(ROOT, 'blog');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'index.html'), paginaLista());
console.log('  ✓ blog/index.html');
for (const a of artigos) {
  mkdirSync(resolve(outDir, a.slug), { recursive: true });
  writeFileSync(resolve(outDir, a.slug, 'index.html'), paginaArtigo(a));
  console.log(`  ✓ blog/${a.slug}/index.html  (${palavras(a)} palavras, ${minutos(a)} min)`);
}

const hoje = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: SITE + '/', prio: '1.0', freq: 'monthly', mod: hoje },
  { loc: SITE + '/blog/', prio: '0.8', freq: 'weekly', mod: hoje },
  ...artigos.map(a => ({ loc: `${SITE}/blog/${a.slug}/`, prio: '0.7', freq: 'monthly', mod: a.atualizado })),
];
writeFileSync(resolve(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.mod}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.prio}</priority>
  </url>`).join('\n')}
</urlset>
`);
console.log(`  ✓ sitemap.xml (${urls.length} URLs)`);
