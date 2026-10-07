package br.com.metonimia.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configurações próprias da aplicação (prefixo "app" no application.yml). */
@ConfigurationProperties("app")
public record AppProperties(Jwt jwt, Admin admin, Upload upload, Privado privado, Mensagens mensagens) {

    /** @param secret chave HMAC com pelo menos 32 caracteres; @param validade duração do login */
    public record Jwt(String secret, Duration validade) {}

    /** Usuário criado automaticamente na primeira inicialização, se a tabela estiver vazia. */
    public record Admin(String usuario, String senha) {}

    /** Pasta onde ficam fotos e vídeos enviados pelo painel (públicos, servidos em /uploads). */
    public record Upload(String diretorio) {}

    /** Pasta de arquivos privados (fotos de intérpretes): NUNCA servida diretamente, só pela API com login. */
    public record Privado(String diretorio) {}

    /**
     * Mensagens para intérpretes.
     * @param remetente endereço que aparece como "De" nos e-mails
     * @param copia endereço que recebe uma cópia de cada mensagem enviada
     */
    public record Mensagens(String remetente, String copia) {}
}
