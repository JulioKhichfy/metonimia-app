package br.com.metonimia.interprete;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;

/**
 * Mensagem para intérpretes, escrita no popup do painel.
 * @param todos true = todos os cadastrados (ignora interpreteIds)
 * @param interpreteIds destinatários quando todos = false
 */
public record MensagemRequest(
        @Size(max = 150, message = "assunto com no máximo 150 caracteres") String assunto,
        @NotBlank(message = "escreva a mensagem") @Size(max = 4000, message = "mensagem com no máximo 4000 caracteres") String texto,
        @NotEmpty(message = "escolha e-mail e/ou WhatsApp") Set<Canal> canais,
        Boolean todos,
        List<Long> interpreteIds) {

    public enum Canal { EMAIL, WHATSAPP }

    /** Boolean: o Jackson 3 recusa campo primitivo ausente; ausente = false. */
    public boolean paraTodos() {
        return Boolean.TRUE.equals(todos);
    }
}
