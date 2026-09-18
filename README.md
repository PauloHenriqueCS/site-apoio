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

## Medição

**Google Tag Manager `GTM-K8R63HL`** é a única tag no código, instalada pelo snippet oficial
no `<head>` (após o `consent default`) e o `<noscript>` logo após `<body>` — em `index.html` e
no `head()`/template de `tools/gerar-blog.mjs` (que gera blog, artigos e 404). GA4
(`G-QSJY2H8W7Z`) e Google Ads (`AW-1001597529`) **não** estão no código: são configurados
dentro do GTM, lendo o `dataLayer`. Não há gtag.js direto, pixel ou outro GTM.

`js/tracking.js` é a camada central: `apoioTrack(nome, dados)` empilha `{ event, ...dados }`
no `dataLayer`. Componentes só informam eventos de negócio; nenhum conhece IDs ou labels.

| Evento | Quando | Parâmetros próprios |
|---|---|---|
| `whatsapp_click` | clique real em link `wa.me` (por delegação) | `placement`, `link_url` (sem a mensagem) |
| `phone_click` | clique real em link `tel:` | `placement`, `phone` (número da empresa) |
| `email_click` | clique real em link `mailto:` | `placement` |
| `service_view` | um serviço fica ativo na seção de serviços (1× cada, nunca no carregamento) | `service_id`, `service_name`, `origem` |
| `form_submit_whatsapp` | formulário encaminhado ao WhatsApp (sem endpoint) | `form_name` |
| `form_submit_success` | **só após resposta 2xx do endpoint**, 1× por submissão | `form_name`, bloco `user_data` |
| `form_submit_error` | endpoint respondeu erro | `form_name` |

Todo evento leva `page_path`, `page_title` e a atribuição mais recente como chaves planas
(`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `gbraid`,
`wbraid`). `placement` vem do atributo `data-placement` do link ou de um ancestral
(`hero`, `contact`, `floating_button`, `post_cta`), nunca do texto do botão.

**Atribuição**: parâmetros de campanha da URL ficam no `localStorage` (`apoio_atribuicao`,
90 dias) em dois blocos — `first` (primeira entrada, nunca sobrescrito) e `latest`
(atualizado quando a URL trouxer parâmetro novo). Só campanha; nunca nome, e-mail ou
mensagem. O formulário envia `latest` em campos ocultos individuais e `first` em
`attribution_first` (JSON).

**Enhanced Conversions**: no `form_submit_success` o evento leva um bloco isolado
`user_data = { email, address: { first_name, last_name } }` (e-mail em minúsculas); o push
seguinte zera `user_data` para nada ficar disponível a outros eventos. Não vai para GA4 como
parâmetro comum, não vai para storage nem para o console. O GTM lê esse bloco na tag de
conversão do formulário e faz o hashing.

**Consent Mode v2**: o `consent default` está no `<head>` com tudo `granted` — não existe
banner. Um banner futuro chama `window.apoioConsent({ ad_storage: 'granted', ... })` e o
padrão passa a `denied`. Ver "Pendências".

**Depuração**: em `localhost` ou com `localStorage.apoio_debug = "1"`, cada evento sai no
console como `[Analytics] nome {...}`, sem o bloco `user_data`. Em produção, nada é logado.

## Formulário

Dois modos, decididos pelo atributo `data-endpoint` do `<form>`:

- **Vazio (hoje)**: ao enviar, abre o WhatsApp da empresa com a mensagem montada (nome,
  e-mail, assunto, mensagem). Não é confirmação de envio, então `form_submit_success`
  não dispara — dispara `form_submit_whatsapp`.
- **Com URL**: `POST` com `FormData` (campos + parâmetros de campanha). Sucesso só com
  resposta 2xx; erro mostra mensagem com o WhatsApp como alternativa. Uma submissão por
  vez (`data-enviando`): três cliques rápidos geram um envio e uma conversão.

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
