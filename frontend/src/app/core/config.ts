/**
 * E-mail e WhatsApp do site público.
 *
 * Em produção vêm do .env do servidor (CONTATO_EMAIL e CONTATO_WHATSAPP): o docker-compose
 * repassa ao build do site, que os injeta aqui (opção "define" do Angular, ver deploy/web.Dockerfile).
 * Mudou o .env? Rode ./deploy/atualizar.sh (ou docker compose up -d --build web).
 * Os valores abaixo valem para o desenvolvimento local e como padrão.
 */
declare const CONTATO_EMAIL_DEFINIDO: string | undefined;
declare const CONTATO_WHATSAPP_DEFINIDO: string | undefined;

const EMAIL_PADRAO = 'assessoria@metonimia.com.br';
const WHATSAPP_PADRAO = '+55 21 99896-1769';

const email = (typeof CONTATO_EMAIL_DEFINIDO === 'string' && CONTATO_EMAIL_DEFINIDO.trim()) || EMAIL_PADRAO;
const whatsapp = (typeof CONTATO_WHATSAPP_DEFINIDO === 'string' && CONTATO_WHATSAPP_DEFINIDO.trim()) || WHATSAPP_PADRAO;

export const CONTATO = {
  /** Também recebe o formulário via FormSubmit (https://formsubmit.co). */
  email,
  /** Só dígitos, com DDI: 5521998961769 (formato do wa.me). */
  whatsappNumero: whatsapp.replace(/\D/g, ''),
  /** Para exibir: (21) 99896-1769 */
  whatsappExibicao: formatarTelefone(whatsapp),
  whatsappMensagem: 'Olá! Vim pelo site da Metonímia.',
} as const;

export const FUSO_HORARIO = 'America/Sao_Paulo';

/** "+55 21 99896-1769" → "(21) 99896-1769". Números fora do padrão brasileiro ficam como vieram. */
function formatarTelefone(numero: string): string {
  const d = numero.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  const m = /^(\d{2})(\d{4,5})(\d{4})$/.exec(d);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : numero.trim();
}
