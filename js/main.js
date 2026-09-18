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

  var servicosVistos = {};
  function setService(index, origem) {
    if (origem !== 'init' && !servicosVistos[index] && window.apoioTrack) {
      servicosVistos[index] = true;
      var nome = servicesItems[index] && $('.services__index-name', servicesItems[index]);
      window.apoioTrack('service_view', { service_id: index + 1, service_name: nome ? nome.textContent.trim() : '', origem: origem || 'scroll' });
    }
    servicesCurrent = index;
    servicesItems.forEach(function (el, i) { el.classList.toggle('is-active', i === index); });
    servicesPanels.forEach(function (el, i) { el.classList.toggle('is-active', i === index); });
    servicesImgs.forEach(function (el, i) { el.classList.toggle('is-active', i === index); });
  }

  if (servicesItems.length) {
    setService(0, 'init');
    servicesItems.forEach(function (item, i) {
      var btn = $('.services__index-btn', item);
      if (btn) btn.addEventListener('click', function () { setService(i, 'clique'); });
    });
    var next = $('#servicesNext');
    if (next) next.addEventListener('click', function () { setService((servicesCurrent + 1) % servicesItems.length, 'seta'); });

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
     Hero C — scrollytelling ligado ao scroll (GSAP + ScrollTrigger, scrub).
     A seção .hero--c é alta (CSS --hero-dur); o .hero__sticky gruda enquanto
     ela passa e o progresso 0→1 desse trecho comanda uma timeline única.

     FASES_HERO: [início, duração] em fração do scroll (0 = topo, 1 = fim).
     Para acelerar/atrasar a animação toda, mude --hero-dur no CSS (mais telas
     de scroll = mais lento). Para mexer numa etapa, mude os números abaixo.
     As regiões do projeto (o que cada cópia "desenha") estão no HTML, em
     data-clip-from/data-clip-to.
     --------------------------------------------------------- */
  var FASES_HERO = {
    cotas:       [0.10, 0.08],   // cotas e linhas de referência do topo (esquerda → direita)
    estrutura:   [0.14, 0.16],   // abertura da porta: linhas principais (cima → baixo)
    secundarias: [0.24, 0.14],   // arco de giro, tracejados à esquerda (da porta para fora)
    detalhe:     [0.28, 0.16],   // corte construtivo à direita (cima → baixo)
                                 // 0.44–0.52: pausa com o projeto completo
    porta:       [0.52, 0.26],   // porta real surge de baixo para cima
    residual:    [0.60, 0.20],   // projeto cai para 55% de opacidade
    pontos:      [0.90, 0.04],   // chamadas: pontos laranja
    linhas:      [0.92, 0.05],   // ... linhas traçadas
    textos:      [0.94, 0.05],   // ... rótulos
    fuga:        [0.96, 0.04]    // ... "Sentido de fuga" por último
  };
  var heroC = $('.hero--c');
  if (heroC) {
    if (!hasGSAP || reduceMotion) {
      heroC.classList.add('hero--static');          // estado final direto, sem scroll longo
    } else {
      heroC.classList.add('js-hero-c');
      // no celular as linhas-guia da esquerda encurtam (rótulos mais perto da porta)
      if (window.matchMedia('(max-width: 760px)').matches) {
        $$('.hero__leader[data-points-mobile]', heroC).forEach(function (l) { l.setAttribute('points', l.getAttribute('data-points-mobile')); });
      }
      var bpImgs   = $$('.hero__bp img', heroC);
      var bpWrap   = $('.hero__bp', heroC);
      var porta    = $('.hero__door', heroC);
      var pontos   = $$('.hero__dot', heroC);
      var linhas   = $$('.hero__leader', heroC);
      var rotulos  = $$('.hero__label:not(.hero__label--fuga), .hero__detalhe', heroC);
      var fugaG    = $('.hero__fuga', heroC);
      var fugaTxt  = $('.hero__label--fuga', heroC);
      var F = FASES_HERO;

      var tlHero = gsap.timeline({
        defaults: { ease: 'none', immediateRender: true },
        scrollTrigger: {
          trigger: heroC,
          start: function () { return 'top ' + headerH(); },
          end: 'bottom bottom',
          scrub: 0.4,
          invalidateOnRefresh: true
        }
      });
      // 1) projeto sendo traçado: cada cópia revela sua região na direção das linhas
      bpImgs.forEach(function (img) {
        var f = F[img.getAttribute('data-fase')] || [0.1, 0.1];
        tlHero.fromTo(img,
          { clipPath: img.getAttribute('data-clip-from'), opacity: 1 },
          { clipPath: img.getAttribute('data-clip-to'), duration: f[1] }, f[0]);
      });
      // 2) porta real: de baixo para cima, ganhando opacidade e assentando
      tlHero.fromTo(porta, { opacity: 0 }, { opacity: 1, duration: F.porta[1] * 0.55, ease: 'power1.out' }, F.porta[0]);
      tlHero.fromTo(porta,
        { clipPath: 'inset(100% 0% 0% 0%)', scale: 0.985, y: 12, transformOrigin: '50% 100%' },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, y: 0, duration: F.porta[1], ease: 'power1.inOut' }, F.porta[0]);
      // 3) projeto vira referência residual (35%), mas continua ao redor
      tlHero.fromTo(bpWrap, { opacity: 1 }, { opacity: 0.55, duration: F.residual[1], ease: 'power1.inOut' }, F.residual[0]);
      // 4) chamadas: pontos → linhas traçadas → rótulos → sentido de fuga
      tlHero.fromTo(pontos, { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' },
        { opacity: 1, scale: 1, duration: F.pontos[1], stagger: F.pontos[1] * 0.3, ease: 'back.out(2)' }, F.pontos[0]);
      tlHero.fromTo(linhas, { opacity: 1, strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: F.linhas[1], stagger: F.linhas[1] * 0.25 }, F.linhas[0]);
      tlHero.fromTo(rotulos, { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: F.textos[1], stagger: F.textos[1] * 0.2, ease: 'power2.out' }, F.textos[0]);
      tlHero.fromTo(fugaG, { opacity: 1, clipPath: 'inset(0% 0% 0% 100%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: F.fuga[1] }, F.fuga[0]);
      tlHero.fromTo(fugaTxt, { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: F.fuga[1] * 0.8, ease: 'power2.out' }, F.fuga[0] + F.fuga[1] * 0.3);
    }
  }

  /* ---------------------------------------------------------
     Formulário — validação em português, sem dependências
     --------------------------------------------------------- */
  var form = $('#quoteForm');
  if (form) {
    var status = $('#formStatus');
    var carregadoEm = Date.now();   // base do tempo de preenchimento enviado ao servidor
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
      var track = window.apoioTrack || function () {};
      var endpoint = (form.getAttribute('data-endpoint') || '').trim();
      var botao = form.querySelector('button[type="submit"]');

      if (!endpoint) {
        /* Sem endpoint configurado: o pedido vai para o WhatsApp da empresa com
           a mensagem pronta. Não é confirmação de envio — form_submit_success
           só dispara na resposta do endpoint. */
        var numero = form.getAttribute('data-whatsapp') || '5511991961322';
        var texto = 'Olá! Solicitação pelo site.\n' +
          'Nome: ' + form.elements.nome.value.trim() + '\n' +
          'E-mail: ' + form.elements.email.value.trim() + '\n' +
          'Assunto: ' + form.elements.assunto.value.trim() +
          (form.elements.mensagem.value.trim() ? '\nMensagem: ' + form.elements.mensagem.value.trim() : '');
        var url = 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
        track('form_submit_whatsapp', { form_name: 'orcamento' });
        // sem a feature 'noopener' de propósito: com ela o navegador devolve null mesmo
        // quando abre a aba, e não dá para saber se o popup foi bloqueado.
        var aberto = window.open(url, '_blank');
        if (aberto) { try { aberto.opener = null; } catch (e) {} }
        showStatus('ok', aberto
          ? 'Abrimos o WhatsApp com a sua solicitação pronta. É só enviar.'
          : 'Não conseguimos abrir o WhatsApp automaticamente. Use o botão "Falar com um especialista" ou ligue para (11) 99196-1322.');
        if (!aberto) { var l = document.createElement('a'); l.href = url; l.target = '_blank'; l.rel = 'noopener'; l.textContent = 'Abrir WhatsApp'; l.style.marginLeft = '.5rem'; status.appendChild(l); }
        return;
      }

      if (form.dataset.enviando === '1') return;          // uma submissão por vez: nunca duas conversões
      form.dataset.enviando = '1';
      if (botao) { botao.disabled = true; botao.setAttribute('aria-busy', 'true'); }
      // dados para Enhanced Conversions, lidos ANTES do reset e entregues à camada
      // de medição em bloco isolado — nunca como parâmetro comum do evento
      var nomeCompleto = form.elements.nome.value.trim().split(/\s+/);
      var userData = {
        email: form.elements.email.value.trim().toLowerCase(),
        address: { first_name: nomeCompleto[0] || '', last_name: nomeCompleto.slice(1).join(' ') }
      };
      // JSON com os campos do formulário (nome, e-mail, assunto, mensagem, honeypot,
      // parâmetros de campanha) + tempo de preenchimento, que o servidor usa como
      // filtro simples contra robôs. O endpoint só responde 200 depois do envio real.
      var payload = {};
      Array.prototype.forEach.call(form.elements, function (el) {
        if (el.name && el.type !== 'submit' && el.type !== 'button') payload[el.name] = el.value;
      });
      payload.tempo_preenchimento = Date.now() - carregadoEm;
      var mensagemErro = 'Não foi possível enviar agora. Tente de novo ou fale conosco pelo WhatsApp: (11) 99196-1322.';
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (data) {
            if (r.ok && data && data.success === true) return data;
            var err = new Error('HTTP ' + r.status);
            err.data = data || {};
            err.status = r.status;
            throw err;
          });
        })
        .then(function () {
          // Conversão do Google Ads (AW-1001597529 / wKKxCPe8w_wcENnUzN0D): a tag no GTM
          // dispara neste evento — nunca no clique, só depois do success:true do servidor.
          track('form_submit_success', { form_name: 'orcamento' }, { user_data: userData });
          showStatus('ok', 'Solicitação recebida! Nossa equipe entra em contato em breve.');
          form.reset();
          Object.keys(rules).forEach(function (name) { var f = form.elements[name]; if (f) f.removeAttribute('aria-invalid'); });
        })
        .catch(function (err) {
          track('form_submit_error', { form_name: 'orcamento', status: err && err.status ? err.status : 0 });
          var data = (err && err.data) || {};
          // erros de campo apontados pelo servidor (mesmas regras do cliente)
          if (data.errors) {
            Object.keys(data.errors).forEach(function (name) {
              var f = form.elements[name], e = document.getElementById('erro-' + name);
              if (f) f.setAttribute('aria-invalid', 'true');
              if (e) e.textContent = data.errors[name];
            });
          }
          // 4xx traz uma mensagem própria (campos, muitas tentativas); 5xx/rede usa a genérica
          var propria = err && err.status && err.status < 500 && typeof data.message === 'string' && data.message;
          showStatus('error', propria ? data.message + ' Se preferir, fale conosco pelo WhatsApp: (11) 99196-1322.' : mensagemErro);
        })
        .finally(function () { form.dataset.enviando = ''; if (botao) { botao.disabled = false; botao.removeAttribute('aria-busy'); } });
    });
  }

  if (hasGSAP) window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
