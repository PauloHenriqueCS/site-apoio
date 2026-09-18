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

## Hero C — `hero-c/` (scrollytelling)

Camadas do hero animado com o scroll, todas no mesmo canvas de 1024×1536:

| Arquivo | Origem | Uso |
|---|---|---|
| `fundo.webp` (+`@768`) | `origem/hero-c/derivados/hero-bg.png` | parede + piso, camada base |
| `projeto.webp` | `origem/hero-c/derivados/hero-blueprint.png` | só as linhas do desenho técnico, com alpha; é "traçado" em 4 regiões |
| `porta.webp` (+`@480`) | `origem/hero-c/derivados/hero-door.png` | porta real recortada no seu bbox, encaixada na abertura do projeto |

Os três PNGs enviados (`origem/hero-c/01…03`) **não compartilham o mesmo referencial**: a
porta ocupava 66% do canvas, a abertura desenhada 42%, e as chamadas apontavam para um
terceiro lugar. Por isso `tools/separar-hero-c.py` separa as linhas do fundo, recorta a
porta, e o HTML encaixa a porta na abertura (x 46%, y 24,3%, largura 40,9% do canvas). As
chamadas (pontos, linhas e rótulos) foram refeitas em HTML/SVG no mesmo sistema de
coordenadas, porque o PNG de chamadas veio com resíduo branco do projeto e sem o fundo dos
rótulos. Se um dia vierem `hero-bg.png` e `hero-blueprint.png` já separados, basta
colocá-los em `derivados/` e rodar `npm run imagens`.

Os heros anteriores continuam disponíveis: A (foto) em `hero-desktop/mobile*` e B (desenho
com chamadas) em `hero-b-*`.

## Diagrama da porta — `porta/`

Seis peças em WebP transparente, vindas de `origem/componentes-v2/` (camadas no mesmo
canvas de 1784×882, já na perspectiva e escala finais — ver `INSTRUCOES-CLAUDE.txt`).
O processamento apara a moldura transparente de cada camada e grava em `medidas.json`
onde ela estava no canvas (`x`, `y`, `w`, `h`). As posições no HTML foram calculadas a
partir desses números com uma escala única, então as peças mantêm o encaixe da
composição-mãe (`00-composicao-final.png`). `origem/componentes/` guarda a versão
anterior das peças, que não é mais usada.

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
