package br.com.metonimia.config;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configurações próprias da aplicação (prefixo "app" no application.yml). */
@ConfigurationProperties("app")
public record AppProperties(Jwt jwt, Admin admin, Upload upload) {

    /** @param secret chave HMAC com pelo menos 32 caracteres; @param validade duração do login */
    public record Jwt(String secret, Duration validade) {}

    /** Usuário criado automaticamente na primeira inicialização, se a tabela estiver vazia. */
    public record Admin(String usuario, String senha) {}

    /** Pasta onde ficam fotos e vídeos enviados pelo painel. */
    public record Upload(String diretorio) {}
}
