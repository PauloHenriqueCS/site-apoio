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

## Hero (animação automática)

O hero é a seção `.hero--c`, com a altura da tela menos o cabeçalho. Uma timeline única do
GSAP desenha o projeto técnico, materializa a porta e revela as chamadas. Ela roda sozinha,
1 segundo depois de a página carregar, e não depende do scroll.

- **Velocidade**: `DURACAO_HERO` (segundos da animação inteira, hoje 10) e `ATRASO_HERO`
  (segundos após o carregamento, hoje 1) em `js/main.js`.
- **Fases**: objeto `FASES_HERO` em `js/main.js`, cada uma `[início, duração]` em fração de
  0 a 1 da duração total (cotas, estrutura, secundárias, detalhe, porta, residual,
  pontos, linhas, textos, fuga).
- **Regiões do desenho**: `data-clip-from`/`data-clip-to` nas 4 cópias do projeto no
  `index.html`, em % do canvas 1024×1536.
- **Desktop**: cena 2:3 à direita, 18% mais alta que a tela (corta o vazio do topo),
  porta a ~74% da largura; texto à esquerda, sem sobreposição com o CTA.
- **Celular**: texto no topo, porta centralizada logo abaixo do botão, projeto nas
  laterais; a cena é dimensionada pelo que sobra de `100svh` (mínimo 440px). Em telas
  muito baixas (iPhone SE) o hero fica com 700px, maior que a tela.
- **Fallback**: sem GSAP, sem JS ou com `prefers-reduced-motion`, a classe `hero--static`
  (ou `.no-js`) mostra o estado final direto.
- **Performance**: só `transform`, `opacity` e `clip-path` animados; `will-change` apenas
  nas camadas animadas; sem filtros; imagens WebP (fundo 34 kB, projeto 90 kB, porta 50 kB).

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
tools/gerar-placeholders.mjs   favicon e ícones do site
tools/atualizar-gsap.mjs       recopia o GSAP de node_modules para assets/vendor
robots.txt, sitemap.xml, site.webmanifest
```

## Deploy

Publique a raiz do repositório (**incluindo `api/` e `api/.htaccess`**) **exceto** `origem/`,
`conteudo/`, `tools/`, `node_modules/` e os arquivos de projeto (`package*.json`, `README.md`).
O formulário precisa de PHP 7.4+ e do arquivo de credenciais fora de `public_html` (ver
`api/LEIA-ME.md`). O `robots.txt` já bloqueia essas
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
| `form_submit_error` | endpoint respondeu erro ou rede falhou | `form_name`, `status` (HTTP; 0 = rede) |

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

O `<form>` envia `POST` em JSON para `data-endpoint="/api/enviar-email.php"`, um PHP com
PHPMailer (SMTP autenticado da HostGator). Sucesso só com `200 {"success":true}`, e só
então o site confirma, limpa o formulário e dispara `form_submit_success` (que no GTM
aciona a conversão do Google Ads). Erro mantém os dados, mostra a mensagem com o WhatsApp
como alternativa e permite tentar de novo. Uma submissão por vez (`data-enviando`).

**As credenciais SMTP ficam fora do repositório** — o que falta e onde preencher está em
[`api/LEIA-ME.md`](api/LEIA-ME.md). Enquanto não forem preenchidas, o endpoint responde
500 e o visitante vê a mensagem de erro amigável.

Se `data-endpoint` ficar vazio, o formulário volta ao modo anterior: abre o WhatsApp da
empresa com a mensagem pronta (`form_submit_whatsapp`, sem conversão).

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

1. **Foto de Manutenção** (serviço 02) — ver `assets/img/LEIA-ME.md`. Hoje o slot usa,
   provisoriamente, a foto da porta instalada.
2. **Endereço completo** no JSON-LD (`streetAddress`, `postalCode`) — hoje só
   constam cidade e estado.
3. **CNPJ / razão social** no rodapé, se aplicável.
4. **Credenciais SMTP do formulário** no servidor (ver `api/LEIA-ME.md`).
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

## Imagens

Todas as imagens atuais são **temporárias**. A lista do que substituir, com
dimensões e observações, está em [`assets/img/LEIA-ME.md`](assets/img/LEIA-ME.md).
