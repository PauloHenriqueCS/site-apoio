# Site Apoio Porta Corta Fogo

Site institucional de página única, em **HTML, CSS e JavaScript puro**, com
scrollytelling em GSAP/ScrollTrigger.

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:3000
npm run imagens    # reprocessa origem/ → assets/img/ (após trocar alguma foto)
```

Não há etapa de build: o que está no repositório é exatamente o que vai para o ar.

## Estrutura

```
index.html                 página inteira (conteúdo + SVG do diagrama da porta)
css/styles.css             design system e todos os estilos
js/main.js                 header, menu, scrollytelling, carrossel, formulário
assets/vendor/             GSAP 3.15 + ScrollTrigger (cópia local, sem CDN)
assets/img/                imagens servidas (derivadas) — ver assets/img/LEIA-ME.md
origem/                    imagens originais, intocadas
tools/processar-imagens.mjs    origem/ → assets/img/ (resize, WebP, logo claro)
tools/gerar-placeholders.mjs   marcadores das fotos que ainda faltam
tools/atualizar-gsap.mjs       recopia o GSAP de node_modules para assets/vendor
robots.txt, sitemap.xml, site.webmanifest
```

## Por que sem framework

O scrollytelling é feito inteiramente por GSAP, que não depende de React. Sem
framework, o buscador recebe o conteúdo completo no primeiro byte (sem hidratação),
o JavaScript total fica em ~130 KB — quase tudo GSAP — e o deploy é copiar a pasta.

Se na etapa 2 o site crescer para várias páginas ou blog, o caminho é portar para
Next.js: as seções já estão delimitadas por `<section>` com ids próprios, e as
animações vivem isoladas em `js/main.js` (bastaria movê-las para um `useEffect`).

## SEO

- HTML semântico, um único `<h1>`, hierarquia de headings correta
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

### Pendências antes de publicar

1. **Três fotos de serviço** (Manutenção, Restauração, Barras antipânico) — ver
   `assets/img/LEIA-ME.md`. Hoje esses slots mostram "FOTO PENDENTE".
2. **Endereço completo** no JSON-LD (`streetAddress`, `postalCode`) — hoje só
   constam cidade e estado.
3. **CNPJ / razão social** no rodapé, se aplicável.
4. **Endpoint do formulário** (ver abaixo).
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
