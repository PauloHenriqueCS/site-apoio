// FIR-610: JSON-LD de /servicos/ com ItemList de Service (C1 e C2 da história).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SERVICOS, servicosItemList } from '../tools/servicos.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://apoiocortafogo.com';
const html = readFileSync(resolve(ROOT, 'servicos/index.html'), 'utf8');
const unesc = (s) => s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const blocos = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => m[1]);
const grafo = () => JSON.parse(blocos[0])['@graph'];
const itemList = () => grafo().find(n => n['@type'] === 'ItemList');
// Cards visíveis: <a class="serv-item" href> ... <h3> ... <span class="serv-item__desc">
const cards = [...html.matchAll(/<a class="serv-item" href="([^"]+)">[\s\S]*?<h3>([\s\S]*?)<\/h3>\s*<span class="serv-item__desc">([\s\S]*?)<\/span>/g)]
  .map(m => ({ u: m[1], t: unesc(m[2]), d: unesc(m[3]) }));

test('C1 borda: um único ld+json, JSON válido e BreadcrumbList preservado', () => {
  assert.equal(blocos.length, 1);
  assert.doesNotThrow(() => JSON.parse(blocos[0]));
  const bc = grafo().find(n => n['@type'] === 'BreadcrumbList');
  assert.ok(bc, 'BreadcrumbList ausente');
  assert.deepEqual(bc.itemListElement.map(i => i.item), [SITE + '/', SITE + '/servicos/']);
});

test('C1 positivo: ItemList com um Service por card, na mesma ordem', () => {
  const il = itemList();
  assert.ok(il, 'ItemList ausente');
  assert.equal(cards.length, 10);
  assert.equal(il.numberOfItems, cards.length);
  assert.equal(il.itemListElement.length, cards.length);
  il.itemListElement.forEach((li, i) => {
    assert.equal(li['@type'], 'ListItem');
    assert.equal(li.position, i + 1);
    assert.equal(li.item['@type'], 'Service');
    assert.equal(li.item.name, cards[i].t);
    assert.equal(li.item.description, cards[i].d);
    assert.equal(li.item.url, SITE + cards[i].u);
    assert.deepEqual(li.item.provider, { '@id': SITE + '/#business' });
  });
});

test('C1 negativo: nenhum Service sem card visível e nenhum campo de preço/oferta', () => {
  const nomesVisiveis = new Set(cards.map(c => c.t));
  for (const li of itemList().itemListElement) assert.ok(nomesVisiveis.has(li.item.name), 'Service sem card: ' + li.item.name);
  assert.doesNotMatch(blocos[0], /"(price|priceRange|priceCurrency|priceSpecification|offers)"/i);
});

test('gerador e HTML em sincronia: o ItemList publicado é o de tools/servicos.mjs', () => {
  assert.deepEqual(itemList(), servicosItemList(SITE));
  assert.deepEqual(cards.map(c => c.t), SERVICOS.map(s => s.t));
});

test('C2 negativo: serviço removido do catálogo some do ItemList', () => {
  const sem = SERVICOS.filter(s => s.n !== '04');
  const il = servicosItemList(SITE, sem);
  assert.equal(il.itemListElement.length, SERVICOS.length - 1);
  assert.ok(!il.itemListElement.some(li => li.item.name === 'Barra antipânico'));
  assert.deepEqual(il.itemListElement.map(li => li.position), sem.map((_, i) => i + 1));
});

test('C2 borda: nome com acento e aspas é escapado e valida no parse', () => {
  const s = [{ t: 'Porta "dupla" — ação \ ç', d: 'Descrição com "aspas" e acentuação', u: '/x/' }];
  const txt = JSON.stringify({ '@graph': [servicosItemList(SITE, s)] }, null, 1);
  const volta = JSON.parse(txt)['@graph'][0].itemListElement[0].item;
  assert.equal(volta.name, s[0].t);
  assert.equal(volta.description, s[0].d);
});

test('lacuna b: serviço sem descrição sai só com o nome', () => {
  const li = servicosItemList(SITE, [{ t: 'Só nome', d: '', u: '/y/' }]).itemListElement[0].item;
  assert.equal('description' in li, false);
  assert.equal(li.name, 'Só nome');
});
