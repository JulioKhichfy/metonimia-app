import { CONTATO } from './config';
import { Servico } from './models';

/**
 * Conteúdo para buscadores (Google) e assistentes de IA (ChatGPT, Gemini, Claude, Perplexity).
 * Os mesmos textos aparecem na página E nos dados estruturados (JSON-LD): o Google exige que
 * os dois coincidam.
 *
 * Endereço oficial do site. Se o domínio mudar, troque também em: src/index.html,
 * public/robots.txt, public/sitemap.xml e public/llms.txt.
 */
export const SITE_URL = 'https://xn--metonmia-g2a.com.br';
export const SITE_NOME = 'Metonímia Produções Acessíveis';

/**
 * Os serviços são editados pelo painel (/admin/servicos) e lidos da API no navegador.
 * Esta lista é só o retrato inicial — igual ao cadastrado pela migração V3__servicos.sql — usado
 * no HTML pré-renderizado do build, que os robôs sem JavaScript leem (não há API durante o build).
 * Se os serviços mudarem muito no painel, vale atualizar esta lista para os robôs verem o mesmo.
 */
export const SERVICOS_PADRAO: Servico[] = [
  {
    id: 1,
    titulo: 'Intérprete de Libras e tradução simultânea',
    descricao:
      'Profissionais de Libras (Língua Brasileira de Sinais) fazem a interpretação simultânea de palestras, congressos, ' +
      'seminários, aulas, reuniões, cerimônias, shows e eventos corporativos. A pessoa surda acompanha tudo em tempo real, ' +
      'junto com o restante do público.',
  },
  {
    id: 2,
    titulo: 'Libras em eventos online e lives',
    descricao:
      'Interpretação em Libras para transmissões ao vivo, webinars e reuniões em Zoom, Microsoft Teams, Google Meet e ' +
      'YouTube, com a janela do intérprete visível durante toda a transmissão.',
  },
  {
    id: 3,
    titulo: 'Tradução para Libras de vídeos (janela de Libras)',
    descricao:
      'Tradução de vídeos institucionais, campanhas, cursos, aulas gravadas e conteúdo para redes sociais, com janela de ' +
      'Libras posicionada e dimensionada para leitura confortável.',
  },
  {
    id: 4,
    titulo: 'Legendagem para surdos e ensurdecidos (LSE)',
    descricao:
      'Legendas que trazem, além das falas, a identificação de quem fala, efeitos sonoros e música — o que a pessoa surda ' +
      'ou com deficiência auditiva precisa para entender o vídeo por completo.',
  },
  {
    id: 5,
    titulo: 'Audiodescrição',
    descricao:
      'Narração das informações visuais de vídeos, espetáculos, exposições e eventos para pessoas cegas ou com baixa ' +
      'visão.',
  },
  {
    id: 6,
    titulo: 'Consultoria em acessibilidade comunicacional',
    descricao:
      'Planejamos com você a acessibilidade de eventos, projetos culturais e conteúdos digitais desde o início, de acordo ' +
      'com a Lei Brasileira de Inclusão — incluindo os recursos exigidos em editais e leis de incentivo à cultura.',
  },
  {
    id: 7,
    titulo: 'Palestras e formações sobre inclusão',
    descricao:
      'Conversas e capacitações para empresas, escolas e equipes sobre acessibilidade, cultura surda, Libras e como ' +
      'comunicar sem deixar ninguém de fora.',
  },
];

/** Âncora de cada serviço na página (#servico-1). */
export function ancoraServico(s: Pick<Servico, 'id'>): string {
  return `servico-${s.id}`;
}

export interface Pergunta {
  pergunta: string;
  resposta: string;
}

export const PERGUNTAS: Pergunta[] = [
  {
    pergunta: 'Como contratar um intérprete de Libras para o meu evento?',
    resposta:
      'Entre em contato com a gente pelo WhatsApp ' + CONTATO.whatsappExibicao + ' ou pelo formulário deste site. Conte a ' +
      'data, o horário, a duração, o local (ou a plataforma, se for online) e o tipo de evento, e a gente conversa sobre ' +
      'o número de profissionais de Libras necessários.',
  },
  {
    pergunta: 'Qual a diferença entre tradução e interpretação em Libras?',
    resposta:
      'A interpretação acontece ao vivo, de forma simultânea, enquanto a pessoa fala — como em palestras, aulas e lives. ' +
      'A tradução é feita sobre um conteúdo já pronto, como um vídeo gravado, com tempo para estudo e revisão.',
  },
  {
    pergunta: 'Por que eventos longos precisam de mais de um intérprete de Libras?',
    resposta:
      'A interpretação simultânea exige muita concentração física e mental. Em atividades mais longas, os intérpretes se ' +
      'revezam em intervalos curtos para manter a qualidade da tradução do início ao fim.',
  },
  {
    pergunta: 'Vocês atendem eventos online?',
    resposta:
      'Sim. Atendemos eventos presenciais e online, como lives, webinars e reuniões em Zoom, Microsoft Teams e Google Meet.',
  },
  {
    pergunta: 'Com quanta antecedência devo contratar?',
    resposta:
      'Quanto antes, melhor: a agenda de profissionais de Libras costuma ficar cheia em datas de muitos eventos. Enviar ' +
      'com antecedência o roteiro, os slides e os nomes próprios que serão citados ajuda os intérpretes a se prepararem.',
  },
  {
    pergunta: 'A acessibilidade em Libras é obrigatória?',
    resposta:
      'A Lei 10.436/2002 reconhece a Libras como meio legal de comunicação no Brasil, e a Lei Brasileira de Inclusão ' +
      '(Lei 13.146/2015) garante às pessoas com deficiência o acesso à informação e à comunicação. Na prática, órgãos ' +
      'públicos, instituições de ensino e muitos editais e leis de incentivo à cultura exigem recursos de acessibilidade ' +
      'como Libras, legendagem e audiodescrição.',
  },
  {
    pergunta: 'Que outros recursos de acessibilidade a Metonímia oferece?',
    resposta:
      'Além de Libras, oferecemos legendagem para surdos e ensurdecidos (LSE), audiodescrição para pessoas cegas ou com ' +
      'baixa visão e consultoria para tornar eventos, projetos culturais e conteúdos digitais acessíveis.',
  },
];

/** Dados estruturados (schema.org) da home: organização, serviços e perguntas frequentes. */
export function dadosEstruturados(servicos: Servico[]): object {
  const organizacao = `${SITE_URL}/#organizacao`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizacao,
        name: SITE_NOME,
        alternateName: ['Metonímia', 'Metonimia Produções Acessíveis'],
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/imagens/logo.png`,
        image: `${SITE_URL}/imagens/logo.png`,
        description:
          'Intérpretes de Libras, tradução simultânea em Libras, legendagem, audiodescrição e consultoria em ' +
          'acessibilidade comunicacional para eventos, empresas, escolas e produções culturais.',
        email: CONTATO.email,
        telephone: '+' + CONTATO.whatsappNumero,
        areaServed: { '@type': 'Country', name: 'Brasil' },
        knowsLanguage: ['pt-BR', 'bzs'], // bzs = Libras (ISO 639-3)
        knowsAbout: [
          'Libras',
          'Língua Brasileira de Sinais',
          'Interpretação de Libras',
          'Tradução simultânea em Libras',
          'Acessibilidade comunicacional',
          'Comunidade surda',
          'Inclusão de pessoas com deficiência',
          'Audiodescrição',
          'Legendagem para surdos e ensurdecidos',
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'Contato e contratação',
          telephone: '+' + CONTATO.whatsappNumero,
          email: CONTATO.email,
          availableLanguage: ['Portuguese', 'Brazilian Sign Language'],
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Serviços de acessibilidade',
          itemListElement: servicos.map((s) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              '@id': `${SITE_URL}/#${ancoraServico(s)}`,
              name: s.titulo,
              description: s.descricao,
              provider: { '@id': organizacao },
              areaServed: { '@type': 'Country', name: 'Brasil' },
            },
          })),
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#site`,
        url: `${SITE_URL}/`,
        name: SITE_NOME,
        inLanguage: 'pt-BR',
        publisher: { '@id': organizacao },
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#perguntas`,
        inLanguage: 'pt-BR',
        mainEntity: PERGUNTAS.map((p) => ({
          '@type': 'Question',
          name: p.pergunta,
          acceptedAnswer: { '@type': 'Answer', text: p.resposta },
        })),
      },
    ],
  };
}
