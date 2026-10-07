package br.com.metonimia.interprete;

import java.util.List;

/**
 * Resultado do envio.
 * @param emailsEnviados nomes de quem recebeu por e-mail
 * @param emailsComFalha nomes cujo e-mail não pôde ser enviado
 * @param semEmail nomes sem e-mail cadastrado (quando o canal e-mail foi escolhido)
 * @param whatsapp links prontos (wa.me) para abrir o WhatsApp com a mensagem escrita
 * @param semWhatsapp nomes cujo celular não está marcado como WhatsApp
 * @param copiaEnviadaPara endereço que recebeu a cópia, ou null se não foi possível
 * @param avisos problemas a mostrar no painel
 */
public record MensagemResponse(
        List<String> emailsEnviados,
        List<String> emailsComFalha,
        List<String> semEmail,
        List<LinkWhatsapp> whatsapp,
        List<String> semWhatsapp,
        String copiaEnviadaPara,
        List<String> avisos) {

    public record LinkWhatsapp(Long interpreteId, String nome, String link) {}
}
