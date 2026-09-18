#!/usr/bin/env python3
"""
Separa as camadas do hero C a partir dos três PNGs de origem/hero-c/ (1024×1536):

  01-fundo-com-projeto.png  → derivados/hero-bg.png (fundo limpo) + hero-blueprint.png (só as linhas, com alpha)
  02-porta.png              → derivados/hero-door.png (porta recortada no seu bbox)
  03-chamadas.png           → derivados/chamada-*.png (cada rótulo recortado; o PNG traz também um
                              resíduo esbranquiçado do projeto, que é descartado)

Rode com: python3 tools/separar-hero-c.py   (precisa de Pillow, numpy e scipy)
Depois: npm run imagens
Se um dia vierem os arquivos já separados (hero-bg.png, hero-blueprint.png, hero-door.png),
basta colocá-los em derivados/ com esses nomes e não rodar este script.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from scipy import ndimage

RAIZ = Path(__file__).resolve().parent.parent / 'origem' / 'hero-c'
OUT = RAIZ / 'derivados'
OUT.mkdir(exist_ok=True)

# ---------- fundo + linhas ----------
fundo = np.array(Image.open(RAIZ / '01-fundo-com-projeto.png').convert('RGB')).astype(np.float32)
H, W, _ = fundo.shape
lum = fundo[:, :, 0] * .299 + fundo[:, :, 1] * .587 + fundo[:, :, 2] * .114
base = ndimage.median_filter(lum, size=15)              # fundo local sem as linhas finas
diff = lum - base
alpha = np.clip((diff - 8) / 70, 0, 1) ** 0.8            # linhas mais marcadas
alpha[alpha < 0.1] = 0                                  # tira o ruído fino (pesa no WebP)
alpha[1205:1228, :] = 0                                 # aresta do piso fica no fundo
mask = alpha > 0.02
base_rgb = ndimage.median_filter(fundo, size=(15, 15, 1))
# fundo limpo: onde há linha (dilatado), usa o fundo mediano
dil = ndimage.binary_dilation(mask, iterations=3)
bg = fundo.copy()
bg[dil] = base_rgb[dil]
# detalhe hachurado à direita: a mediana não limpa; copia o tom da coluna limpa da mesma linha
for y in range(180, 1205):
    bg[y, 870:] = np.median(bg[y, 520:860], axis=0)
Image.fromarray(bg.clip(0, 255).astype(np.uint8)).save(OUT / 'hero-bg.png', optimize=True)
# linhas: cor "desmisturada" do fundo
a = alpha[:, :, None]
cor = np.where(a > 0, base_rgb + (fundo - base_rgb) / np.maximum(a, 1e-3), 0)
cor = np.clip(cor * 1.12 + 18, 0, 255)                  # traço um pouco mais claro
bp = np.dstack([cor, alpha * 255]).astype(np.uint8)
Image.fromarray(bp, 'RGBA').save(OUT / 'hero-blueprint.png', optimize=True)

# ---------- porta ----------
porta = Image.open(RAIZ / '02-porta.png').convert('RGBA')
pa = np.array(porta)[:, :, 3]
ys, xs = np.where(pa > 30)
m = 4
box = (max(0, xs.min() - m), max(0, ys.min() - m), min(W, xs.max() + m + 1), min(H, ys.max() + m + 1))
porta.crop(box).save(OUT / 'hero-door.png', optimize=True)

# ---------- chamadas ----------
lab = np.array(Image.open(RAIZ / '03-chamadas.png').convert('RGBA'))
la = lab[:, :, 3].astype(int); r, g, b = (lab[:, :, i].astype(int) for i in range(3))
laranja = (la > 150) & (r > 190) & (g > 80) & (g < 210) & (b < 110)
solido = la > 120
RECORTES = {
    'chamada-mola':    (605, 180, 805, 255),
    'chamada-folha':   (120, 610, 300, 690),
    'chamada-barra':   (95, 880, 275, 985),
    'chamada-fuga':    (415, 1095, 795, 1245),   # seta tracejada + rótulo "Sentido de fuga"
    'chamada-detalhe': (780, 40, 1020, 115),
}
medidas = {'canvas': {'w': int(W), 'h': int(H)}, 'porta': {'x': int(box[0]), 'y': int(box[1]), 'w': int(box[2] - box[0]), 'h': int(box[3] - box[1])}}
for nome, (x0, y0, x1, y1) in RECORTES.items():
    reg = np.zeros_like(solido); reg[y0:y1, x0:x1] = True
    keep = reg & (solido | laranja)
    keep = ndimage.binary_dilation(keep, iterations=1) & reg
    out = lab.copy(); out[~keep, 3] = 0
    ys, xs = np.where(keep)
    bb = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    Image.fromarray(out, 'RGBA').crop(bb).save(OUT / f'{nome}.png', optimize=True)
    medidas[nome] = {'x': int(bb[0]), 'y': int(bb[1]), 'w': int(bb[2] - bb[0]), 'h': int(bb[3] - bb[1])}
(OUT / 'medidas.json').write_text(json.dumps(medidas, indent=2) + '\n')
print(json.dumps(medidas, indent=1))
