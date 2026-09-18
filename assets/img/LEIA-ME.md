# Imagens — o que substituir

Todos os arquivos abaixo são **temporários** (SVG gerado por `npm run placeholders`).
Ao trocar por uma imagem real, **mantenha o mesmo nome de arquivo** e apenas ajuste a
extensão no `index.html` — nada mais precisa mudar.

## Fotos

| Arquivo | Onde aparece | Tamanho sugerido | Observação |
|---|---|---|---|
| `hero-porta-corta-fogo.*` | Topo da página | 1600×900 | Foto escura; o texto fica sobre a metade esquerda — deixe o assunto à direita |
| `servico-01-instalacao.*` | Serviços — Instalação | 640×800 (retrato 4:5) | |
| `servico-02-manutencao.*` | Serviços — Manutenção | 640×800 | |
| `servico-03-restauracao.*` | Serviços — Restauração | 640×800 | |
| `servico-04-barras.*` | Serviços — Barras antipânico | 640×800 | |
| `cta-porta-detalhe.*` | Bloco "Conte o que suas portas precisam" | 720×620 | |
| `og-apoio-porta-corta-fogo.*` | Compartilhamento (WhatsApp, LinkedIn, Facebook) | **1200×630** | **Precisa ser JPG ou PNG** — redes sociais não renderizam SVG |

Formato recomendado: **WebP** com JPG de fallback. Exceto o `og-`, que deve ser JPG ou PNG.

## Marca

| Arquivo | Uso |
|---|---|
| `logo-apoio.svg` | Cabeçalho e rodapé. O CSS inverte a cor no topo do hero (`filter: brightness(0) invert(1)`), então o SVG precisa funcionar em versão monocromática |
| `favicon.svg` | Aba do navegador |

Opcional: adicionar `apple-touch-icon.png` (180×180) e referenciá-lo no `<head>`.

## Logos de clientes — `clientes/`

18 arquivos, exibidos em 3 telas de 6 no carrossel. O CSS aplica `grayscale(1)` e
tira na interação, então logos em versão monocromática escura funcionam melhor.
Tamanho sugerido: 220×76, SVG de preferência.

Os 6 primeiros já estão nomeados com os clientes reais; os demais (`07`…`18`) são
genéricos. Se você tiver menos de 18 logos, apague os arquivos sobrando e remova os
`<div class="clients__logo">` correspondentes no `index.html` — o carrossel se ajusta sozinho.

> **Direitos de uso:** confirme a autorização de cada cliente antes de publicar a logo dele.

## Peças da porta (seção "Por dentro da segurança")

O diagrama explodido hoje é **SVG inline**, dentro do `index.html` (bloco `<g id="parts">`).
Cada peça é um `<g>` com `id` próprio e os atributos `data-dx` / `data-dy`, que definem
o quanto ela se afasta durante a animação.

Para trocar pelos PNGs transparentes em camadas, substitua o conteúdo de cada `<g>`
por um `<image>` — os `id` e os `data-*` continuam valendo e o GSAP segue funcionando:

```html
<g class="part" id="part-panic" data-dx="-176" data-dy="-58">
  <image href="/assets/img/pecas/barra-antipanico.png" x="742" y="500" width="184" height="62"/>
</g>
```

Peças existentes: `part-closer` (mola aérea), `part-frame` (batente), `part-leaf`
(folha da porta), `part-hinges` (dobradiças), `part-lock` (fechadura), `part-panic`
(barra antipânico).
