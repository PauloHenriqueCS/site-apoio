# Imagens

## Como funciona

`origem/` guarda os arquivos que você enviou, sem nenhuma alteração.
`assets/img/` é **derivado** — tudo ali é gerado e pode ser refeito a qualquer momento:

```bash
npm run imagens        # processa origem/ → assets/img/ (redimensiona, gera WebP)
npm run placeholders   # regera o favicon e o ícone do site
```

Para trocar uma foto: substitua o arquivo em `origem/` e rode `npm run imagens`.

## O que ainda falta

| Slot | Arquivo atual | O que precisa |
|---|---|---|
| Serviço 02 — Manutenção | `servico-02-manutencao.webp` (provisório: foto da porta instalada) | foto própria de manutenção, retrato ou paisagem, mínimo ~1100 px de altura |

Ao enviá-la, coloque em `origem/` e troque a origem da linha `servico-02-manutencao` em
`tools/processar-imagens.mjs`.

Opcional: `apple-touch-icon.png` (180×180) para o atalho no iOS.

## O que já está definitivo

**Fotos** — WebP servido, JPEG de fallback, via `<picture>`:

| Uso | Origem | Saída |
|---|---|---|
| Hero (desktop) | `01-hero-desktop.png` | `hero-desktop.webp` + `@1200` |
| Hero (celular) | `02-hero-mobile.png` | `hero-mobile.webp` + `@768` |
| Hero variante B (teste, não usada no site) | `09-hero-b-desktop.png`, `10-hero-b-mobile.png` | `hero-b-desktop.webp` + `@1200`, `hero-b-mobile.webp` + `@768` |
| Serviço 01 — Instalação | `06-servico-instalacao.png` | `servico-01-instalacao.webp` |
| Serviço 02 — Manutenção (provisório) | `03-porta-instalada.png` | `servico-02-manutencao.webp` |
| Serviço 03 — Restauração | `07-servico-restauracao.png` | `servico-03-restauracao.webp` |
| Serviço 04 — Barras antipânico | `08-servico-barra-antipanico.png` | `servico-04-barras.webp` |
| CTA de contato | `04-porta-cta-detalhe.png` | `cta-porta-detalhe.webp` |
| Compartilhamento | `01-hero-desktop.png` | `og-apoio-porta-corta-fogo.jpg` (1200×630) |

O hero usa **duas fotos diferentes**, não a mesma recortada: a horizontal no desktop e
a vertical no celular, trocadas por `<picture media="...">`.

**Marca** — `logo-apoio` (original) e `logo-apoio-branco` (variante clara). A segunda é
gerada automaticamente invertendo só os pixels neutros do logotipo, preservando o laranja
da marca; sem ela o logo sumiria sobre o hero escuro. O cabeçalho troca de uma para a
outra conforme sai do topo.

**Clientes** — 8 logos em `clientes/`, exibidos 4 por tela em 2 telas do carrossel.
Estão em 169×97, o tamanho publicado no site antigo; o processamento não amplia, porque
esticar esses arquivos só deixaria o resultado borrado. Se conseguir versões maiores ou
vetoriais com os clientes, elas entram no lugar sem nenhuma mudança de código.

## Diagrama da porta — `porta/`

Sete peças em WebP transparente, recortadas dos PNGs de `origem/componentes/`
(o processamento apara a moldura vazia de cada uma). A sétima, `lateral.webp`, são as
duas tiras verticais que o mockup chama de "Batente": não vieram como PNG próprio, foram
extraídas da composição completa (`origem/componentes/07-batente-lateral.png`).

O posicionamento vive no HTML, em variáveis CSS por peça:

```html
<div class="porta__peca" style="--x:41%;--y:50%;--h:88%;--r:620/1214;--z:1"
     data-dx="-4" data-dy="0">
```

- `--x` / `--y` — centro da peça, em % do container
- `--h` — altura em % do container; a largura sai de `--r`, a proporção real da peça
  (vinda de `medidas.json`). Dimensionar pela altura garante que nada estoure a cena.
- `--z` — ordem de empilhamento
- `data-dx` / `data-dy` — de onde a peça **parte** na animação, apontando para a porta
  montada. `dx` é % da largura, `dy` é % da altura (a cena é ~2× mais larga que alta,
  então um mesmo valor nos dois eixos jogaria as peças para fora).

As chamadas (`.porta__label`), os pontos (`.porta__dot`) e as linhas (`<polyline>` no SVG
`.porta__leaders`) usam o mesmo sistema de coordenadas em % do container — para mover uma
chamada, ajuste os três no `index.html`.

No celular o mesmo diagrama é usado, com uma segunda coordenada por peça (`--xm/--ym/--hm`),
pontos e chamadas (`--xm/--ym`) e um conjunto próprio de linhas (`<g class="l-mob">`).

## Blog — `blog/`

| Arquivo | Uso |
|---|---|
| `desenho-tecnico-porta.webp` | Desenho técnico da abertura de cada artigo (transparente, esmaecido à direita) |
| `porta-instalada.webp` / `.jpg` | Figura dentro do artigo, com legenda |
| `og-blog.jpg` | Compartilhamento dos artigos (1200×630) |

Originais em `origem/blog/`. As duas imagens são compartilhadas pelos 12 artigos; ver README para dar uma foto própria a um artigo.
