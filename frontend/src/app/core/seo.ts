import { CONTATO } from './config';

/**
 * Conteúdo para buscadores (Google) e assistentes de IA (ChatGPT, Gemini, Claude, Perplexity).
 * Os mesmos textos aparecem na página E nos dados estruturados (JSON-LD): o Google exige que
 * os dois coincidam, então edite só aqui.
 *
 * Endereço oficial do site. Se o domínio mudar, troque também em: src/index.html,
 * public/robots.txt, public/sitemap.xml e public/llms.txt.
 */
export const SITE_URL = 'https://xn--metonmia-g2a.com.br';
export const SITE_NOME = 'Metonímia Produções Acessíveis';

export interface Servico {
  id: string;
  titulo: string;
  texto: string;
}

export const SERVICOS: Servico[] = [
  {
    id: 'interprete-de-libras',
    titulo: 'Intérprete de Libras e tradução simultânea',
    texto:
      'Profissionais de Libras (Língua Brasileira de Sinais) fazem a interpretação simultânea de palestras, congressos, ' +
      'seminários, aulas, reuniões, cerimônias, shows e eventos corporativos. A pessoa surda acompanha tudo em tempo real, ' +
      'junto com o restante do público.',
  },
  {
    id: 'libras-online',
    titulo: 'Libras em eventos online e lives',
    texto:
      'Interpretação em Libras para transmissões ao vivo, webinars e reuniões em Zoom, Microsoft Teams, Google Meet e ' +
      'YouTube, com a janela do intérprete visível durante toda a transmissão.',
  },
  {
    id: 'janela-de-libras',
    titulo: 'Tradução para Libras de vídeos (janela de Libras)',
    texto:
      'Tradução de vídeos institucionais, campanhas, cursos, aulas gravadas e conteúdo para redes sociais, com janela de ' +
      'Libras posicionada e dimensionada para leitura confortável.',
  },
  {
    id: 'legendagem',
    titulo: 'Legendagem para surdos e ensurdecidos (LSE)',
    texto:
      'Legendas que trazem, além das falas, a identificação de quem fala, efeitos sonoros e música — o que a pessoa surda ' +
      'ou com deficiência auditiva precisa para entender o vídeo por completo.',
  },
  {
    id: 'audiodescricao',
    titulo: 'Audiodescrição',
    texto:
      'Narração das informações visuais de vídeos, espetáculos, exposições e eventos para pessoas cegas ou com baixa ' +
      'visão.',
  },
  {
    id: 'consultoria',
    titulo: 'Consultoria em acessibilidade comunicacional',
    texto:
      'Planejamos com você a acessibilidade de eventos, projetos culturais e conteúdos digitais desde o início, de acordo ' +
      'com a Lei Brasileira de Inclusão — incluindo os recursos exigidos em editais e leis de incentivo à cultura.',
  },
  {
    id: 'palestras-inclusao',
    titulo: 'Palestras e formações sobre inclusão',
    texto:
      'Conversas e capacitações para empresas, escolas e equipes sobre acessibilidade, cultura surda, Libras e como ' +
      'comunicar sem deixar ninguém de fora.',
  },
];

export interface Pergunta {
  pergunta: string;
  resposta: string;
}

export const PERGUNTAS: Pergunta[] = [
  {
    pergunta: 'Como contratar um intérprete de Libras para o meu evento?',
    resposta:
      'Fale com a Metonímia pelo WhatsApp ' + CONTATO.whatsappExibicao + ' ou pelo formulário deste site. Informe a data, ' +
      'o horário, a duração, o local (ou a plataforma, se for online) e o tipo de evento. Com isso enviamos um orçamento ' +
      'com o número de profissionais de Libras necessários.',
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
export function dadosEstruturados(): object {
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
          contactType: 'Orçamentos e contratação',
          telephone: '+' + CONTATO.whatsappNumero,
          email: CONTATO.email,
          availableLanguage: ['Portuguese', 'Brazilian Sign Language'],
        },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Serviços de acessibilidade',
          itemListElement: SERVICOS.map((s) => ({
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              '@id': `${SITE_URL}/#${s.id}`,
              name: s.titulo,
              description: s.texto,
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
