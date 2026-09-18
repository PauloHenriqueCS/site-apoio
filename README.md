# Site Apoio Porta Corta Fogo

Site institucional de página única, em **HTML, CSS e JavaScript puro**, com
scrollytelling em GSAP/ScrollTrigger.

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:3000
npm run imagens    # reprocessa origem/ → assets/img/ (após trocar alguma foto)
npm run blog       # regera as páginas do blog, a 404 e o sitemap a partir do JSON
npm run check      # verificação técnica: h1, title/description, canonical, OG, JSON-LD, imagens, links, sitemap, robots
```

`npm run check` é o "lint" deste projeto estático — sai com erro se qualquer página
pública falhar em um dos itens. Rode antes de publicar.

## Blog

As páginas em `blog/` são **geradas** por `tools/gerar-blog.mjs` a partir de
`conteudo/blog/artigos.json` e commitadas — o deploy continua sem build. Para
alterar um texto, edite o JSON e rode `npm run blog`; para um artigo novo, acrescente
um objeto ao JSON seguindo os existentes (`slug`, `titulo`, `descricao`, `secoes`,
`faq`, `cta`, `citacao`, `referencias`, `data`).

Cada artigo é publicado em `/blog/<slug>/` com título SEO, meta description,
canonical, Open Graph, `BlogPosting` + `FAQPage` + `BreadcrumbList` em JSON-LD, e
entra no `sitemap.xml`. A imagem de abertura (desenho técnico) e a figura (porta
instalada) são as duas do layout aprovado, compartilhadas por todos os artigos; para
dar uma foto própria a um artigo, troque `imagem.arquivo` no JSON e coloque a foto
processada em `assets/img/blog/`.

A citação em destaque de cada artigo é uma frase do próprio texto (`citacao` no JSON) —
pode ser trocada livremente.

Não há etapa de build: o que está no repositório é exatamente o que vai para o ar.

## Estrutura

```
index.html                 página inicial
blog/                      listagem e um diretório por artigo (gerados — não edite à mão)
conteudo/blog/artigos.json os 12 artigos: texto, metadados de SEO, FAQ, referências
css/styles.css             design system e estilos da home
css/blog.css               estilos do blog (carrega depois de styles.css)
js/main.js                 header, menu, scrollytelling, carrossel, formulário
assets/vendor/             GSAP 3.15 + ScrollTrigger (cópia local, sem CDN)
assets/img/                imagens servidas (derivadas) — ver assets/img/LEIA-ME.md
origem/                    imagens originais, intocadas
tools/processar-imagens.mjs    origem/ → assets/img/ (resize, WebP, logo claro)
tools/gerar-blog.mjs           conteudo/blog/artigos.json → blog/ + sitemap.xml
tools/gerar-placeholders.mjs   marcadores das fotos que ainda faltam
tools/atualizar-gsap.mjs       recopia o GSAP de node_modules para assets/vendor
robots.txt, sitemap.xml, site.webmanifest
```

## Deploy

Publique a raiz do repositório **exceto** `origem/`, `conteudo/`, `tools/`, `node_modules/`
e os arquivos de projeto (`package*.json`, `README.md`). O `robots.txt` já bloqueia essas
pastas caso venham junto, mas o ideal é não enviá-las (só `origem/` tem 15 MB). Configure
no host: redirecionamento `http → https` e `www → sem www` (ou o inverso; o canonical usa
`https://apoiocortafogo.com/` sem www), e a página `404.html` como resposta de "não encontrado".

## Medição (preparado, sem nada instalado)

`js/tracking.js` expõe `window.apoioTrack(nome, dados)`. Ele empilha o evento em
`window.dataLayer` (a convenção que o Google Tag Manager e o GA4 leem) e dispara um
`CustomEvent` `apoio:track`. **Nenhuma ferramenta está instalada**: o `dataLayer` é só um
array na página até o GTM/GA4 entrar.

| Evento | Quando dispara |
|---|---|
| `whatsapp_click` | clique em qualquer link `wa.me` (por delegação — inclui o botão flutuante) |
| `phone_click` | clique em qualquer link `tel:` |
| `email_click` | clique em qualquer link `mailto:` |
| `service_view` | um serviço fica ativo na seção de serviços (uma vez por serviço, nunca no carregamento) |
| `form_submit_whatsapp` | formulário encaminhado ao WhatsApp (modo sem endpoint) |
| `form_submit_success` | **somente** após resposta 2xx do endpoint do formulário |
| `form_submit_error` | endpoint respondeu erro ou não respondeu |

Todo evento leva `page_path`, `page_title` e os parâmetros de campanha guardados
(`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `gbraid`,
`wbraid`). Eles são capturados da URL no primeiro acesso, guardados por 90 dias no
`localStorage` (primeiro toque prevalece) e copiados para os campos ocultos do formulário.

Para ligar o GTM depois: inserir o snippet oficial no `<head>` de `index.html` e no
`head()` de `tools/gerar-blog.mjs` — nada mais muda.

## Formulário

Dois modos, decididos pelo atributo `data-endpoint` do `<form>`:

- **Vazio (hoje)**: ao enviar, abre o WhatsApp da empresa com a mensagem montada (nome,
  e-mail, assunto, mensagem). Não é confirmação de envio, então `form_submit_success`
  não dispara — dispara `form_submit_whatsapp`.
- **Com URL**: `POST` com `FormData` (campos + parâmetros de campanha). Sucesso só com
  resposta 2xx; erro mostra mensagem com o WhatsApp como alternativa.

Já existem validação em português, `aria-invalid`, mensagens por campo e um campo
honeypot anti-spam. Não há backend neste repositório: a escolha do serviço (formulário
de terceiros, função serverless, e-mail) é a próxima decisão.

## Por que sem framework

O scrollytelling é feito inteiramente por GSAP, que não depende de React. Sem
framework, o buscador recebe o conteúdo completo no primeiro byte (sem hidratação),
o JavaScript total fica em ~130 KB — quase tudo GSAP — e o deploy é copiar a pasta.

Se na etapa 2 o site crescer para várias páginas ou blog, o caminho é portar para
Next.js: as seções já estão delimitadas por `<section>` com ids próprios, e as
animações vivem isoladas em `js/main.js` (bastaria movê-las para um `useEffect`).

## SEO

- HTML semântico, um único `<h1>` por página, hierarquia de headings correta
- Fonte Figtree hospedada localmente (`assets/fonts/`, via @fontsource), com `font-display: swap`, preload das duas faces da primeira dobra e nenhuma requisição a terceiros
- `<title>` (64 caracteres) e meta description (213 caracteres)
- JSON-LD com `LocalBusiness` + `ProfessionalService`, catálogo de serviços,
  telefone, e-mail, horário e área de atendimento
- Open Graph e Twitter Card
- `canonical`, `robots.txt` e `sitemap.xml`
- `alt` em todas as imagens, `lang="pt-BR"`
- `width`/`height` em todas as imagens (evita layout shift), `loading="lazy"`
  fora da primeira dobra, `fetchpriority="high"` + `preload` no hero
- WebP com fallback JPEG via `<picture>`; hero com foto própria para cada orientação
  de tela (horizontal no desktop, vertical no celular) e `srcset` por largura

### Dados estruturados

Home: `LocalBusiness` + `ProfessionalService` (que é um `Organization`), `WebSite` e
`WebPage`, só com dados que existem no site: nome, descrição, telefones, e-mail, cidade/UF,
área de atendimento e catálogo de serviços. Artigos: `BlogPosting` (headline, description,
datePublished, dateModified, author, publisher, image, mainEntityOfPage), `FAQPage` e
`BreadcrumbList`.

Faltam, e devem ser preenchidos no JSON-LD do `index.html` quando existirem: endereço
completo (`streetAddress`, `postalCode`), horário de atendimento, CNPJ/razão social
(`legalName`, `taxID`), redes sociais (`sameAs`) e `geo`.

### Pendências antes de publicar

1. **Três fotos de serviço** (Manutenção, Restauração, Barras antipânico) — ver
   `assets/img/LEIA-ME.md`. Hoje esses slots mostram "FOTO PENDENTE".
2. **Endereço completo** no JSON-LD (`streetAddress`, `postalCode`) — hoje só
   constam cidade e estado.
3. **CNPJ / razão social** no rodapé, se aplicável.
4. **Endpoint do formulário** (ver "Formulário").
5. Cadastrar o site no Google Search Console e enviar o `sitemap.xml`.
6. Confirmar a data em `<lastmod>` no `sitemap.xml` a cada publicação relevante.

### Direitos de uso

Os 8 logos de clientes vieram do site atual. Confirme a autorização de cada um
antes de publicar.

## Acessibilidade

- Navegação por teclado com skip link e foco visível
- `prefers-reduced-motion`: desliga as animações e entrega o diagrama da porta já
  na posição final
- Sem JavaScript o conteúdo continua todo legível
- Os serviços também navegam por clique, não só por scroll

## Formulário

Hoje o envio é apenas simulado no cliente (`js/main.js`, busque por `ETAPA 2`).
Para funcionar de verdade, aponte para um endpoint e trate a resposta:

```js
const r = await fetch('/api/orcamento', { method: 'POST', body: new FormData(form) });
```

Já existem validação em português, marcação `aria-invalid` e um campo honeypot
anti-spam.

## Imagens

Todas as imagens atuais são **temporárias**. A lista do que substituir, com
dimensões e observações, está em [`assets/img/LEIA-ME.md`](assets/img/LEIA-ME.md).
