/* =========================================================
   Camada de medição — um único ponto para ligar analytics depois.

   trackEvent(nome, dados) empilha o evento em window.dataLayer (a convenção
   que Google Tag Manager e GA4 leem) e dispara um CustomEvent "apoio:track".
   Enquanto nenhuma ferramenta estiver instalada, isso não envia nada a lugar
   nenhum: o dataLayer é só um array na página.

   Eventos já emitidos pelo site:
     whatsapp_click        clique em qualquer link wa.me
     phone_click           clique em qualquer link tel:
     email_click           clique em qualquer link mailto:
     service_view          um serviço ficou ativo na seção de serviços
     form_submit_whatsapp  formulário encaminhado ao WhatsApp (sem endpoint)
     form_submit_success   SOMENTE após resposta 2xx do endpoint do formulário

   Parâmetros de campanha (utm_*, gclid, gbraid, wbraid) presentes na URL são
   guardados no primeiro acesso (localStorage, 90 dias), anexados a todo
   evento e copiados para os campos ocultos do formulário.
   ========================================================= */
(function () {
  'use strict';

  var PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid'];
  var CHAVE = 'apoio_atribuicao';
  var DIAS = 90;

  function lerGuardado() {
    try {
      var raw = localStorage.getItem(CHAVE);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj._em || Date.now() - obj._em > DIAS * 864e5) return null;
      return obj;
    } catch (e) { return null; }
  }

  function capturarDaUrl() {
    var q = new URLSearchParams(window.location.search);
    var achou = {};
    PARAMS.forEach(function (k) { var v = q.get(k); if (v) achou[k] = v.slice(0, 200); });
    if (!Object.keys(achou).length) return lerGuardado();
    var atual = lerGuardado();
    if (atual) return atual;                       // primeiro toque prevalece
    achou._em = Date.now();
    achou.landing_page = window.location.pathname;
    try { localStorage.setItem(CHAVE, JSON.stringify(achou)); } catch (e) {}
    return achou;
  }

  var atribuicao = capturarDaUrl() || {};

  function dadosAtribuicao() {
    var out = {};
    PARAMS.forEach(function (k) { if (atribuicao[k]) out[k] = atribuicao[k]; });
    return out;
  }

  function trackEvent(nome, dados) {
    var ev = Object.assign({ event: nome, page_path: window.location.pathname, page_title: document.title }, dadosAtribuicao(), dados || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(ev);
    try { document.dispatchEvent(new CustomEvent('apoio:track', { detail: ev })); } catch (e) {}
    return ev;
  }

  /* campos ocultos do formulário recebem a atribuição guardada */
  function preencherFormulario() {
    PARAMS.forEach(function (k) {
      var campos = document.querySelectorAll('input[name="' + k + '"]');
      Array.prototype.forEach.call(campos, function (c) { c.value = atribuicao[k] || ''; });
    });
  }

  /* cliques de contato, por delegação: vale para links que existirem depois */
  function secaoDe(el) {
    var s = el.closest('section, footer, header');
    return (s && (s.id || s.className.split(' ')[0])) || '';
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (/^https?:\/\/(wa\.me|api\.whatsapp\.com)/.test(href)) trackEvent('whatsapp_click', { link_url: href, link_text: a.textContent.trim().slice(0, 60), secao: secaoDe(a) });
    else if (href.indexOf('tel:') === 0) trackEvent('phone_click', { phone: href.slice(4), secao: secaoDe(a) });
    else if (href.indexOf('mailto:') === 0) trackEvent('email_click', { email: href.slice(7), secao: secaoDe(a) });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', preencherFormulario);
  else preencherFormulario();

  window.apoioTrack = trackEvent;
  window.apoioAtribuicao = dadosAtribuicao;
})();
