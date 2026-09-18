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

  /* ---------------------------------------------------------
     Ano no rodapé
     --------------------------------------------------------- */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Header — fundo sólido ao sair do hero
     --------------------------------------------------------- */
  var header = $('#header');
  var hero = $('.hero');

  function syncHeader() {
    if (!header) return;
    var threshold = hero ? hero.offsetHeight - header.offsetHeight - 40 : 80;
    header.classList.toggle('is-stuck', window.scrollY > Math.max(threshold, 80));
  }
  syncHeader();
  window.addEventListener('scroll', syncHeader, { passive: true });
  window.addEventListener('resize', syncHeader);

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

    navToggle.addEventListener('click', function () {
      setNav(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    $$('a', nav).forEach(function (link) {
      link.addEventListener('click', function () { setNav(false); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setNav(false);
        navToggle.focus();
      }
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 1000) setNav(false);
    });
  }

  /* ---------------------------------------------------------
     Link ativo conforme a seção visível
     --------------------------------------------------------- */
  var navLinks = $$('.nav__link');
  var sections = navLinks
    .map(function (l) { return document.getElementById(l.getAttribute('href').slice(1)); })
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (l) {
          l.setAttribute('aria-current', String(l.getAttribute('href') === '#' + entry.target.id));
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------------------------------------------------------
     Botão flutuante do WhatsApp
     --------------------------------------------------------- */
  var waFloat = $('#waFloat');
  if (waFloat) {
    var toggleWa = function () { waFloat.classList.toggle('is-visible', window.scrollY > 600); };
    toggleWa();
    window.addEventListener('scroll', toggleWa, { passive: true });
  }

  /* ---------------------------------------------------------
     SERVIÇOS — scrollytelling
     Desktop: seção fixada, índice/painel/imagem trocam com o scroll.
     Mobile: lista estática (CSS), nenhum JS de cena.
     --------------------------------------------------------- */
  var servicesItems  = $$('.services__index-item');
  var servicesPanels = $$('.services__panel');
  var servicesImgs   = $$('#servicesMedia img');
  var servicesMarker = $('#servicesMarker');

  function setService(index) {
    servicesItems.forEach(function (el, i) { el.classList.toggle('is-active', i === index); });
    servicesPanels.forEach(function (el, i) { el.classList.toggle('is-active', i === index); });
    servicesImgs.forEach(function (el, i) { el.classList.toggle('is-active', i === index); });

    var active = servicesItems[index];
    if (servicesMarker && active) {
      servicesMarker.style.height = active.offsetHeight + 'px';
      servicesMarker.style.transform = 'translateY(' + active.offsetTop + 'px)';
    }
  }

  if (servicesItems.length) {
    setService(0);
    window.addEventListener('resize', function () {
      var current = servicesItems.findIndex(function (el) { return el.classList.contains('is-active'); });
      setService(current < 0 ? 0 : current);
    });

    // Clique também navega, para quem não usa o scroll
    servicesItems.forEach(function (item, i) {
      var btn = $('.services__index-btn', item);
      if (btn) btn.addEventListener('click', function () { setService(i); });
    });

    // Cena fixada: cada trecho do scroll ativa um serviço
    if (hasGSAP && !reduceMotion) {
      gsap.matchMedia().add('(min-width: 901px) and (min-height: 700px)', function () {
        var steps = servicesItems.length;
        ScrollTrigger.create({
          trigger: '#servicesScrolly',
          start: 'center center',
          end: '+=' + (steps * 420),
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          onUpdate: function (self) {
            var i = Math.min(steps - 1, Math.floor(self.progress * steps));
            var current = servicesItems.findIndex(function (el) { return el.classList.contains('is-active'); });
            if (i !== current) setService(i);
          },
          onRefresh: function () { setService(0); }
        });
      });
    }
  }

  /* ---------------------------------------------------------
     PORTA EXPLODIDA — scrollytelling
     As peças nascem montadas e se afastam conforme o scroll;
     as chamadas aparecem em sequência.
     --------------------------------------------------------- */
  var parts  = $$('#parts .part');
  var labels = $$('#labels .part-label');

  function buildExploded(pin) {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#explodedStage',
        start: pin ? 'center center' : 'top 75%',
        end: pin ? '+=1100' : 'bottom 60%',
        scrub: 0.8,
        pin: pin,
        pinSpacing: pin,
        anticipatePin: pin ? 1 : 0
      }
    });

    parts.forEach(function (part, i) {
      var dx = parseFloat(part.getAttribute('data-dx')) || 0;
      var dy = parseFloat(part.getAttribute('data-dy')) || 0;
      tl.fromTo(part,
        { x: -dx, y: -dy, opacity: dx || dy ? 0.55 : 1 },
        { x: 0, y: 0, opacity: 1, ease: 'power2.out', duration: 1 },
        i * 0.08
      );
    });

    tl.fromTo(labels,
      { opacity: 0, x: function (i, el) { return el.getAttribute('data-side') === 'left' ? 24 : -24; } },
      { opacity: 1, x: 0, ease: 'power2.out', duration: 0.6, stagger: 0.12 },
      0.55
    );

    return tl;
  }

  if (hasGSAP && parts.length && !reduceMotion) {
    var mm = gsap.matchMedia();
    // Só fixa a cena onde há altura sobrando; no mobile a animação roda sem pin.
    mm.add('(min-width: 901px) and (min-height: 700px)', function () { buildExploded(true); });
    mm.add('(max-width: 900px), (max-height: 699px)',    function () { buildExploded(false); });
  }

  /* ---------------------------------------------------------
     Reveal on scroll
     --------------------------------------------------------- */
  if (hasGSAP && !reduceMotion) {
    $$('[data-reveal]').forEach(function (el, i) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', delay: (i % 4) * 0.06,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
  } else {
    $$('[data-reveal]').forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
  }

  /* ---------------------------------------------------------
     Processo — barra preenche conforme o scroll
     --------------------------------------------------------- */
  var processTrack = $('#processTrack');
  if (processTrack && 'IntersectionObserver' in window) {
    var steps = $$('.process__step', processTrack);
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        processTrack.querySelector('.process__line').style.setProperty('--p', '100%');
        steps.forEach(function (step, i) {
          setTimeout(function () { step.classList.add('is-on'); }, i * 160);
        });
        obs.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    io.observe(processTrack);
  }

  /* ---------------------------------------------------------
     Carrossel de clientes
     --------------------------------------------------------- */
  var track = $('#clientsTrack');
  if (track) {
    var slides = $$('.clients__slide', track);
    var prev = $('#clientsPrev');
    var next = $('#clientsNext');
    var count = $('#clientsCount');
    var idx = 0;

    var render = function () {
      track.style.transform = 'translateX(-' + (idx * 100) + '%)';
      if (count) count.textContent = (idx + 1) + ' / ' + slides.length;
      if (prev) prev.disabled = idx === 0;
      if (next) next.disabled = idx === slides.length - 1;
      slides.forEach(function (s, i) { s.setAttribute('aria-hidden', String(i !== idx)); });
    };

    var go = function (n) { idx = Math.max(0, Math.min(slides.length - 1, n)); render(); };
    if (prev) prev.addEventListener('click', function () { go(idx - 1); });
    if (next) next.addEventListener('click', function () { go(idx + 1); });

    // arrastar / swipe
    var startX = null;
    track.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (startX === null) return;
      var delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 50) go(idx + (delta < 0 ? 1 : -1));
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
      var rule = rules[field.name];
      if (!rule) return true;
      var result = rule(field.value);
      var errorEl = document.getElementById('erro-' + field.name);
      var ok = result === true;
      field.setAttribute('aria-invalid', String(!ok));
      if (errorEl) errorEl.textContent = ok ? '' : result;
      return ok;
    };

    Object.keys(rules).forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      field.addEventListener('blur', function () { validateField(field); });
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    var showStatus = function (state, message) {
      if (!status) return;
      status.dataset.state = state;
      status.textContent = message;
      status.classList.add('is-visible');
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      // honeypot: bot preencheu campo escondido
      if (form.elements['empresa_hp'] && form.elements['empresa_hp'].value) return;

      // map, não every: every para na primeira falha e deixaria
      // os campos seguintes sem marcação de erro.
      var firstInvalid = null;
      var results = Object.keys(rules).map(function (name) {
        var field = form.elements[name];
        var ok = validateField(field);
        if (!ok && !firstInvalid) firstInvalid = field;
        return ok;
      });
      var valid = results.every(Boolean);

      if (!valid) {
        showStatus('error', 'Revise os campos destacados para continuar.');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      /* ETAPA 2 — trocar pelo endpoint real:
         fetch('/api/orcamento', { method:'POST', body:new FormData(form) }) */
      showStatus('ok', 'Solicitação recebida! Nossa equipe entra em contato em breve.');
      form.reset();
      Object.keys(rules).forEach(function (name) {
        var field = form.elements[name];
        if (field) field.removeAttribute('aria-invalid');
      });
    });
  }

  /* Recalcula as cenas depois que fontes/imagens assentam */
  if (hasGSAP) {
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
})();
