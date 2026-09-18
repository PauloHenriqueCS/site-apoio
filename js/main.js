/* =========================================================
   Apoio Porta Corta Fogo — interações
   Dependências: GSAP + ScrollTrigger (carregados antes deste arquivo)
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) document.documentElement.classList.add('reduced-motion');

  var hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var headerH = function () { return ($('#header') || {}).offsetHeight || 84; };

  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Cabeçalho — sombra ao rolar
     --------------------------------------------------------- */
  var header = $('#header');
  function syncHeader() { if (header) header.classList.toggle('is-stuck', window.scrollY > 8); }
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });

  /* ---------------------------------------------------------
     Menu mobile
     --------------------------------------------------------- */
  var navToggle = $('#navToggle');
  var nav = $('#nav');
  if (navToggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    navToggle.addEventListener('click', function () { setNav(navToggle.getAttribute('aria-expanded') !== 'true'); });
    $$('a', nav).forEach(function (l) { l.addEventListener('click', function () { setNav(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); navToggle.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 1000) setNav(false); });
  }

  /* ---------------------------------------------------------
     Link ativo conforme a seção visível
     --------------------------------------------------------- */
  var navLinks = $$('.nav__link');
  var sections = navLinks.map(function (l) { return document.getElementById(l.getAttribute('href').slice(1)); }).filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (l) { l.setAttribute('aria-current', String(l.getAttribute('href') === '#' + entry.target.id)); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* Botão flutuante do WhatsApp */
  var waFloat = $('#waFloat');
  if (waFloat) {
    var toggleWa = function () { waFloat.classList.toggle('is-visible', window.scrollY > 600); };
    toggleWa();
    window.addEventListener('scroll', toggleWa, { passive: true });
  }

  /* ---------------------------------------------------------
     SERVIÇOS — scrollytelling
     Desktop: seção fixada abaixo do cabeçalho; o scroll (ou a
     seta) percorre os quatro serviços. Mobile: lista estática.
     --------------------------------------------------------- */
  var servicesItems  = $$('.services__index-item');
  var servicesPanels = $$('.services__panel');
  var servicesImgs   = $$('#servicesMedia img');
  var servicesCurrent = 0;

  function setService(index) {
    servicesCurrent = index;
    servicesItems.forEach(function (el, i) { el.classList.toggle('is-active', i === index); });
    servicesPanels.forEach(function (el, i) { el.classList.toggle('is-active', i === index); });
    servicesImgs.forEach(function (el, i) { el.classList.toggle('is-active', i === index); });
  }

  if (servicesItems.length) {
    setService(0);
    servicesItems.forEach(function (item, i) {
      var btn = $('.services__index-btn', item);
      if (btn) btn.addEventListener('click', function () { setService(i); });
    });
    var next = $('#servicesNext');
    if (next) next.addEventListener('click', function () { setService((servicesCurrent + 1) % servicesItems.length); });

    if (hasGSAP && !reduceMotion) {
      gsap.matchMedia().add('(min-width: 901px) and (min-height: 640px)', function () {
        var steps = servicesItems.length;
        ScrollTrigger.create({
          trigger: '#servicos',
          start: function () { return 'top ' + headerH(); },
          end: '+=' + (steps * 380),
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          onUpdate: function (self) {
            var i = Math.min(steps - 1, Math.floor(self.progress * steps));
            if (i !== servicesCurrent) setService(i);
          }
        });
      });
    }
  }

  /* ---------------------------------------------------------
     PORTA EXPLODIDA — scrollytelling
     As peças nascem um pouco AFASTADAS da composição e se aproximam com
     o scroll até parar exatamente no arranjo final; então entram as
     chamadas, as linhas e os pontos.

     data-dx/data-dy: deslocamento DE PARTIDA da peça a partir da posição
     final (para fora da porta). dx em % da largura do container, dy em %
     da ALTURA (a cena é ~2× mais larga que alta). Animamos a <img>
     interna: o wrapper carrega o translate(-50%,-50%) do CSS.

     Fixação: a seção inteira, quando cabe abaixo do cabeçalho; senão só o
     diagrama — assim a cena nunca "rola solta" em telas baixas.
     --------------------------------------------------------- */
  var diagrama = $('#portaDiagrama');
  var pecas    = diagrama ? $$('.porta__peca', diagrama) : [];
  var chamadas = diagrama ? $$('.porta__label', diagrama) : [];
  var leaders  = diagrama ? $$('.porta__leaders polyline', diagrama) : [];
  var dots     = diagrama ? $$('.porta__dot', diagrama) : [];

  if (hasGSAP && diagrama && pecas.length && !reduceMotion) {
    var montarCena = function (mobile) {
      var fator = mobile ? 0.7 : 1.7;        // quanto as peças partem afastadas (× data-dx); menos no celular
      var largura = function () { return diagrama.offsetWidth || 1; };
      var altura  = function () { return diagrama.offsetHeight || 1; };
      var stage   = $('#explodedStage');
      var livre   = function () { return window.innerHeight - headerH(); };
      var cabeSecao    = function () { return stage.offsetHeight <= livre() - 8; };
      var cabeDiagrama = function () { return diagrama.offsetHeight <= livre() - 48; };
      var alvo = !mobile && cabeSecao() ? stage : diagrama;
      var pin  = !mobile && (cabeSecao() || cabeDiagrama());

      // Etapa 1 — as peças se aproximam ENQUANTO a seção entra na tela, para a
      // composição já estar pronta quando ela chega ao topo.
      var topo = function () { return headerH() + (alvo === stage ? 0 : 24); };
      var tlPecas = gsap.timeline({
        scrollTrigger: {
          trigger: alvo,
          start: mobile ? 'top 100%' : 'top 95%',
          end: function () { return mobile ? 'top 65%' : (pin ? 'top ' + topo() : 'top 40%'); },
          scrub: 0.6,
          invalidateOnRefresh: true
        }
      });
      pecas.forEach(function (peca, i) {
        var img = $('img', peca);
        var dx = parseFloat(peca.getAttribute('data-dx')) || 0;
        var dy = parseFloat(peca.getAttribute('data-dy')) || 0;
        tlPecas.fromTo(img,
          { x: function () { return (dx / 100) * largura() * fator; },
            y: function () { return (dy / 100) * altura() * (mobile ? fator : 1); },
            opacity: dx || dy ? 0.85 : 1 },
          { x: 0, y: 0, opacity: 1, ease: 'power2.inOut', duration: 1 },
          i * 0.04
        );
      });

      // Etapa 2 — chamadas, linhas e pontos. No desktop a seção fica presa
      // brevemente enquanto elas entram; no celular seguem a etapa 1.
      var tl = gsap.timeline({
        scrollTrigger: mobile ? {
          trigger: alvo, start: 'top 65%', end: 'top 45%', scrub: 0.6, invalidateOnRefresh: true   // completo antes de o diagrama passar pelo centro
        } : {
          trigger: alvo,
          start: function () { return 'top ' + topo(); },
          end: '+=420',
          scrub: 0.6,
          pin: pin,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });
      tl.fromTo(chamadas,
        { opacity: 0, x: function (i, el) { return el.classList.contains('porta__label--esq') ? 14 : -14; } },
        { opacity: 1, x: 0, ease: 'power2.out', duration: 0.5, stagger: 0.08 }, 0);
      tl.fromTo(leaders, { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.08 }, 0.1);
      tl.fromTo(dots, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, stagger: 0.08, ease: 'back.out(2)' }, 0.15);
    };
    var mmCena = gsap.matchMedia();
    mmCena.add('(min-width: 901px)', function () { montarCena(false); });
    mmCena.add('(max-width: 900px)', function () { montarCena(true); });
  }

  /* ---------------------------------------------------------
     Revelação ao rolar — sem depender do GSAP, para valer também no blog.
     Irmãos marcados no mesmo pai entram em cascata (--d).
     --------------------------------------------------------- */
  var reveals = $$('[data-reveal]');
  if (reveals.length && !reduceMotion && 'IntersectionObserver' in window) {
    reveals.forEach(function (el) {
      var irmaos = Array.prototype.filter.call(el.parentElement.children, function (c) { return c.hasAttribute('data-reveal'); });
      var i = irmaos.indexOf(el);
      if (i > 0) el.style.setProperty('--d', Math.min(i, 6) * 0.14 + 's');
    });
    var ioReveal = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { ioReveal.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Processo — a linha preenche e os pontos acendem em sequência */
  var processTrack = $('#processTrack');
  if (processTrack && 'IntersectionObserver' in window) {
    var steps = $$('.process__step', processTrack);
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        $('.process__line', processTrack).style.setProperty('--p', '100%');
        steps.forEach(function (step, i) { setTimeout(function () { step.classList.add('is-on'); }, i * 160); });
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    io.observe(processTrack);
  }

  /* ---------------------------------------------------------
     Clientes — trilho contínuo, N logos por tela (--per-view no CSS),
     avança uma tela por clique sem deixar buraco na última.
     --------------------------------------------------------- */
  var track = $('#clientsTrack');
  if (track) {
    var viewport = track.parentElement;
    var logos = $$('.clients__logo', track);
    var prev = $('#clientsPrev'), next2 = $('#clientsNext'), count = $('#clientsCount');
    var page = 0;

    var perView = function () { return parseInt(getComputedStyle(viewport).getPropertyValue('--per-view'), 10) || 6; };
    var pages   = function () { return Math.max(1, Math.ceil(logos.length / perView())); };

    var render = function () {
      var n = perView(), total = pages();
      page = Math.max(0, Math.min(total - 1, page));
      var offset = Math.min(page * n, Math.max(0, logos.length - n));   // última tela sempre cheia
      track.style.transform = 'translateX(-' + (offset * (100 / n)) + '%)';
      if (count) count.textContent = (page + 1) + ' / ' + total;
      if (prev) prev.disabled = page === 0;
      if (next2) next2.disabled = page >= total - 1;
    };

    if (prev) prev.addEventListener('click', function () { page--; render(); });
    if (next2) next2.addEventListener('click', function () { page++; render(); });
    window.addEventListener('resize', render);

    var startX = null;
    track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var d = e.changedTouches[0].clientX - startX;
      if (Math.abs(d) > 50) { page += d < 0 ? 1 : -1; render(); }
      startX = null;
    }, { passive: true });

    render();
  }

  /* ---------------------------------------------------------
     Formulário — validação em português, sem dependências
     --------------------------------------------------------- */
  var form = $('#quoteForm');
  if (form) {
    var status = $('#formStatus');
    var rules = {
      nome:    function (v) { return v.trim().length >= 2 || 'Informe seu nome.'; },
      email:   function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Informe um e-mail válido.'; },
      assunto: function (v) { return v.trim().length >= 3 || 'Informe o assunto.'; }
    };
    var validateField = function (field) {
      var rule = rules[field.name]; if (!rule) return true;
      var result = rule(field.value), ok = result === true;
      field.setAttribute('aria-invalid', String(!ok));
      var errorEl = document.getElementById('erro-' + field.name);
      if (errorEl) errorEl.textContent = ok ? '' : result;
      return ok;
    };
    Object.keys(rules).forEach(function (name) {
      var field = form.elements[name]; if (!field) return;
      field.addEventListener('blur', function () { validateField(field); });
      field.addEventListener('input', function () { if (field.getAttribute('aria-invalid') === 'true') validateField(field); });
    });
    var showStatus = function (state, message) {
      if (!status) return;
      status.dataset.state = state; status.textContent = message; status.classList.add('is-visible');
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.elements['empresa_hp'] && form.elements['empresa_hp'].value) return;   // honeypot
      // map, não every: every para na primeira falha e deixaria os demais sem marcação
      var firstInvalid = null;
      var results = Object.keys(rules).map(function (name) {
        var field = form.elements[name], ok = validateField(field);
        if (!ok && !firstInvalid) firstInvalid = field;
        return ok;
      });
      if (!results.every(Boolean)) {
        showStatus('error', 'Revise os campos destacados para continuar.');
        if (firstInvalid) firstInvalid.focus();
        return;
      }
      /* ETAPA 2 — trocar pelo endpoint real:
         fetch('/api/orcamento', { method:'POST', body:new FormData(form) }) */
      showStatus('ok', 'Solicitação recebida! Nossa equipe entra em contato em breve.');
      form.reset();
      Object.keys(rules).forEach(function (name) { var f = form.elements[name]; if (f) f.removeAttribute('aria-invalid'); });
    });
  }

  if (hasGSAP) window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
