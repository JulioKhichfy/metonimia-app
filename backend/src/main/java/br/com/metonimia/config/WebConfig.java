package br.com.metonimia.config;

import br.com.metonimia.upload.ArmazenamentoService;
import java.time.Duration;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.CacheControl;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serve /uploads/** a partir da pasta de uploads. Em produção o Caddy entrega esses arquivos
 * direto do disco; este mapeamento garante que funcione também em desenvolvimento.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final ArmazenamentoService armazenamento;

    public WebConfig(ArmazenamentoService armazenamento) {
        this.armazenamento = armazenamento;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String local = armazenamento.raiz().toUri().toString();
        if (!local.endsWith("/")) {
            local += "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(local)
                // nomes são UUIDs: o conteúdo de uma URL nunca muda
                .setCacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic());
    }
}
