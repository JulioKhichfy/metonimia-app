export type TipoPublicacao = 'PALESTRA' | 'EVENTO';
export type TipoMidia = 'IMAGEM' | 'VIDEO' | 'VIDEO_LINK';

export interface Midia {
  tipo: TipoMidia;
  url: string;
  /** Texto alternativo (fotos) ou legenda (vídeos). */
  descricao?: string | null;
}

export interface Publicacao {
  id: number;
  tipo: TipoPublicacao;
  /** ISO-8601 em UTC, ex.: 2026-10-06T22:00:00Z */
  dataHora: string;
  local: string;
  descricaoHtml: string;
  corFundo: string;
  /** Null = automática (preto ou branco conforme o fundo). */
  corTexto?: string | null;
  linkYoutube?: string | null;
  linkInstagram?: string | null;
  linkX?: string | null;
  midias: Midia[];
  atualizadoEm: string;
}

export interface PublicacaoPayload {
  tipo: TipoPublicacao;
  dataHora: string;
  local: string;
  descricaoHtml: string;
  corFundo: string;
  corTexto: string | null;
  linkYoutube: string | null;
  linkInstagram: string | null;
  linkX: string | null;
  midias: Midia[];
}

export interface Servico {
  id: number;
  titulo: string;
  /** Texto simples; quebras de linha são preservadas na exibição. */
  descricao: string;
}

export type ServicoPayload = Pick<Servico, 'titulo' | 'descricao'>;

export interface Pergunta {
  id: number;
  pergunta: string;
  /** Texto simples; quebras de linha são preservadas na exibição. */
  resposta: string;
}

export type PerguntaPayload = Pick<Pergunta, 'pergunta' | 'resposta'>;

export interface Interprete {
  id: number;
  nome: string;
  /** yyyy-MM-dd */
  dataNascimento: string;
  endereco: string;
  email: string | null;
  /** Só dígitos: 21999990000 */
  celular: string;
  celularWhatsapp: boolean;
  temFoto: boolean;
  atualizadoEm: string;
}

export interface InterpretePayload {
  nome: string;
  dataNascimento: string;
  endereco: string;
  email: string | null;
  celular: string;
  celularWhatsapp: boolean;
  removerFoto: boolean;
}

export type CanalMensagem = 'EMAIL' | 'WHATSAPP';

export interface MensagemPayload {
  assunto: string;
  texto: string;
  canais: CanalMensagem[];
  todos: boolean;
  interpreteIds: number[];
}

export interface MensagemResultado {
  emailsEnviados: string[];
  emailsComFalha: string[];
  semEmail: string[];
  whatsapp: { interpreteId: number; nome: string; link: string }[];
  semWhatsapp: string[];
  copiaEnviadaPara: string | null;
  avisos: string[];
}

export interface Rotulos {
  singular: string;
  plural: string;
  titulo: string;
  artigo: 'a' | 'o';
  ancora: string;
  chamada: string;
  idFuturas: string;
  idPassadas: string;
  tituloFuturas: string;
  tituloPassadas: string;
  vazioFuturas: string;
  vazioPassadas: string;
}

export const ROTULOS: Record<TipoPublicacao, Rotulos> = {
  PALESTRA: {
    singular: 'palestra',
    plural: 'palestras',
    titulo: 'Palestras',
    artigo: 'a',
    ancora: 'palestras',
    chamada: 'Conversas sobre acessibilidade',
    idFuturas: 'palestras_futuras',
    idPassadas: 'palestras_passadas',
    tituloFuturas: 'Próximas palestras',
    tituloPassadas: 'Palestras realizadas',
    vazioFuturas: 'Nenhuma palestra agendada no momento. Quer levar uma palestra para a sua instituição? Fale com a gente.',
    vazioPassadas: 'As palestras realizadas vão aparecer aqui.',
  },
  EVENTO: {
    singular: 'evento',
    plural: 'eventos',
    titulo: 'Eventos',
    artigo: 'o',
    ancora: 'eventos',
    chamada: 'Onde a Metonímia está presente',
    idFuturas: 'eventos_futuros',
    idPassadas: 'eventos_passados',
    tituloFuturas: 'Próximos eventos',
    tituloPassadas: 'Eventos realizados',
    vazioFuturas: 'Nenhum evento agendado no momento.',
    vazioPassadas: 'Os eventos realizados vão aparecer aqui.',
  },
};

export function ehFutura(p: Pick<Publicacao, 'dataHora'>, agoraMs: number): boolean {
  return new Date(p.dataHora).getTime() > agoraMs;
}
