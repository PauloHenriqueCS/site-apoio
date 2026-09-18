/* =========================================================
   Camada central de medição — o site só fala com esta camada.

   O Google Tag Manager (GTM-K8R63HL) é instalado no <head> de cada página e
   lê window.dataLayer. Nenhum componente conhece GA4, Google Ads, labels de
   conversão ou Measurement IDs: o site informa eventos de negócio, o GTM
   decide para onde mandar.

   API pública
     apoioTrack(nome, dados)                  empilha { event: nome, ...dados } no dataLayer
     apoioTrack(nome, dados, { user_data })   idem, com dados do usuário em bloco isolado
                                              (Enhanced Conversions) — só na conversão real
     apoioAtribuicao()                        { latest: {...}, first: {...} } com utm/gclid
     apoioConsent(estado)                     gtag('consent','update', estado) para um banner futuro

   Eventos emitidos pelo site
     whatsapp_click        clique real em qualquer link wa.me
     phone_click           clique real em qualquer link tel:
     email_click           clique real em qualquer link mailto:
     service_view          um serviço ficou ativo na seção de serviços (uma vez cada)
     form_submit_whatsapp  formulário encaminhado ao WhatsApp (modo sem endpoint)
     form_submit_success   SOMENTE após resposta 2xx do endpoint do formulário
     form_submit_error     endpoint respondeu erro ou não respondeu

   Todo evento leva page_path, page_title, placement (quando houver) e a
   atribuição mais recente (utm_*, gclid, gbraid, wbraid) como chaves planas.

   Atribuição: os parâmetros de campanha da URL são guardados no localStorage
   por 90 dias, em dois blocos — "first" (primeira entrada, nunca sobrescrito)
   e "latest" (atualizado sempre que a URL trouxer um parâmetro novo). Só
   parâmetros de campanha são guardados: nunca nome, e-mail ou mensagem.

   Depuração: em localhost, ou com localStorage.apoio_debug = "1", cada evento
   sai no console como "[Analytics] nome {...}" — sem o bloco user_data.
   ========================================================= */
(function () {
  'use strict';

  var PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
  var CHAVE = 'apoio_atribuicao';
  var DIAS = 90;

  var debug = (function () {
    try {
      return /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) || localStorage.getItem('apoio_debug') === '1';
    } catch (e) { return false; }
  })();

  /* ---------- atribuição ---------- */
  function ler() {
    try {
      var obj = JSON.parse(localStorage.getItem(CHAVE) || 'null');
      if (!obj || typeof obj !== 'object') return null;
      if (obj.utm_source || obj.gclid) obj = { first: obj, latest: obj };   // formato antigo (um bloco só)
      if (!obj.first || Date.now() - (obj.first._em || 0) > DIAS * 864e5) return null;
      return obj;
    } catch (e) { return null; }
  }
  function gravar(obj) { try { localStorage.setItem(CHAVE, JSON.stringify(obj)); } catch (e) {} }

  function daUrl() {
    var q = new URLSearchParams(window.location.search);
    var achou = {};
    PARAMS.forEach(function (k) { var v = q.get(k); if (v) achou[k] = String(v).slice(0, 200); });
    if (!Object.keys(achou).length) return null;
    achou._em = Date.now();
    achou.landing_page = window.location.pathname;
    return achou;
  }

  var guardado = ler();
  var novo = daUrl();
  if (novo) {
    guardado = guardado ? { first: guardado.first, latest: novo } : { first: novo, latest: novo };
    gravar(guardado);
  }
  var atribuicao = guardado || { first: {}, latest: {} };

  function bloco(src) { var o = {}; PARAMS.forEach(function (k) { if (src && src[k]) o[k] = src[k]; }); return o; }
  function apoioAtribuicao() { return { latest: bloco(atribuicao.latest), first: bloco(atribuicao.first) }; }

  /* ---------- eventos ---------- */
  function trackEvent(nome, dados, opcoes) {
    window.dataLayer = window.dataLayer || [];
    var ev = Object.assign(
      { event: nome, page_path: window.location.pathname, page_title: document.title },
      bloco(atribuicao.latest),
      dados || {}
    );
    var userData = opcoes && opcoes.user_data;
    if (userData) ev.user_data = userData;            // bloco isolado: só o GTM lê, só na conversão
    window.dataLayer.push(ev);
    if (userData) window.dataLayer.push({ user_data: null });   // não deixa o dado disponível para eventos seguintes
    if (debug) {
      var copia = Object.assign({}, ev); delete copia.user_data;
      try { console.log('[Analytics] ' + nome, copia); } catch (e) {}
    }
    try { document.dispatchEvent(new CustomEvent('apoio:track', { detail: { event: nome } })); } catch (e) {}
    return ev;
  }

  /* ---------- consentimento (preparado; não há banner hoje) ---------- */
  function apoioConsent(estado) {
    if (typeof window.gtag === 'function') window.gtag('consent', 'update', estado);
  }

  /* ---------- formulário: campos ocultos recebem a atribuição ---------- */
  function preencherFormulario() {
    PARAMS.forEach(function (k) {
      Array.prototype.forEach.call(document.querySelectorAll('input[name="' + k + '"]'), function (c) { c.value = atribuicao.latest[k] || ''; });
    });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="attribution_first"]'), function (c) {
      var f = bloco(atribuicao.first); c.value = Object.keys(f).length ? JSON.stringify(f) : '';
    });
  }

  /* ---------- cliques de contato, por delegação ----------
     placement vem do atributo data-placement do link (ou de um ancestral);
     na falta dele, do id da seção. Nunca do texto do botão. */
  function placementDe(el) {
    var p = el.closest('[data-placement]');
    if (p) return p.getAttribute('data-placement');
    var s = el.closest('section, footer, header');
    return (s && (s.id || s.className.split(' ')[0])) || 'unknown';
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)/.test(href)) trackEvent('whatsapp_click', { placement: placementDe(a), link_url: href.split('?')[0] });
    else if (href.indexOf('tel:') === 0) trackEvent('phone_click', { placement: placementDe(a), phone: href.slice(4) });
    else if (href.indexOf('mailto:') === 0) trackEvent('email_click', { placement: placementDe(a) });
  }, { passive: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preencherFormulario);
  else preencherFormulario();

  window.apoioTrack = trackEvent;
  window.apoioAtribuicao = apoioAtribuicao;
  window.apoioConsent = apoioConsent;
})();
