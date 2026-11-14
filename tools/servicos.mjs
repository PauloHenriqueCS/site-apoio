/**
 * Catálogo da página /servicos/ — fonte única dos cards visíveis e do JSON-LD
 * (ItemList de Service). Módulo puro: sem efeitos colaterais, importável em testes.
 */
export const SERVICOS = [
  { n: '01', icon: 'instalacao',  t: 'Instalação de porta corta-fogo',            d: 'Equipe técnica especializada para uma instalação segura e conforme as normas.',       u: '/instalacao-de-porta-corta-fogo/' },
  { n: '02', icon: 'manutencao',  t: 'Manutenção de porta corta-fogo',            d: 'Manutenção preventiva e corretiva para garantir o pleno funcionamento.',              u: '/manutencao-de-porta-corta-fogo/' },
  { n: '03', icon: 'restauracao', t: 'Restauração de porta corta-fogo',           d: 'Recuperação de portas danificadas, prolongando sua vida útil e segurança.',           u: '/restauracao-de-porta-corta-fogo/' },
  { n: '04', icon: 'barra',       t: 'Barra antipânico',                          d: 'Instalação, ajuste e manutenção do dispositivo de saída de emergência.',              u: '/barra-antipanico/' },
  { n: '05', icon: 'vistoria',    t: 'Vistoria de porta corta-fogo para AVCB',    d: 'Inspeção técnica completa com laudo e orientações para o seu AVCB.',                   u: '/vistoria-porta-corta-fogo-avcb/' },
  { n: '06', icon: 'adequacao',   t: 'Adequação de porta corta-fogo para AVCB',   d: 'Ajustes e adequações para atendimento aos requisitos do Corpo de Bombeiros.',         u: '/adequacao-porta-corta-fogo-avcb/' },
  { n: '07', icon: 'naofecha',    t: 'Porta corta-fogo não fecha',                d: 'Diagnosticamos a causa e realizamos o reparo adequado.',                              u: '/porta-corta-fogo-nao-fecha/' },
  { n: '08', icon: 'condenada',   t: 'Porta corta-fogo condenada',                d: 'Avaliação técnica e orientações para substituição segura e conforme a norma.',        u: '/porta-corta-fogo-condenada/' },
  { n: '09', icon: 'visita',      t: 'Visita técnica',                            d: 'Atendimento no local com análise especializada e orientações objetivas.',             u: '/visita-tecnica/' },
  { n: '10', icon: 'empresa',     t: 'Empresa de porta corta-fogo em SP',         d: 'Mais de 15 anos de experiência em São Paulo e região.',                               u: '/empresa-de-porta-corta-fogo-sp/' },
];

/**
 * ItemList com um Service por card, na mesma ordem. Só repete nome, descrição e
 * link já visíveis na página; sem preço/oferta. Serviço sem descrição: só o nome.
 */
export function servicosItemList(site, servicos = SERVICOS) {
  return {
    '@type': 'ItemList',
    name: 'Serviços para portas corta-fogo',
    numberOfItems: servicos.length,
    itemListElement: servicos.map((s, i) => {
      const service = { '@type': 'Service', name: s.t };
      if (s.d) service.description = s.d;
      service.url = site + s.u;
      service.provider = { '@id': site + '/#business' };
      return { '@type': 'ListItem', position: i + 1, item: service };
    }),
  };
}
