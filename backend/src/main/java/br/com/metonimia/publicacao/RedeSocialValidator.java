package br.com.metonimia.publicacao;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Links do rodapé: só https e só do domínio da rede correspondente. Vazio vira null. */
@Component
class RedeSocialValidator {

    enum Rede {
        YOUTUBE("YouTube", Set.of("youtube.com", "youtu.be")),
        INSTAGRAM("Instagram", Set.of("instagram.com")),
        X("X", Set.of("x.com", "twitter.com"));

        final String nome;
        final Set<String> dominios;

        Rede(String nome, Set<String> dominios) {
            this.nome = nome;
            this.dominios = dominios;
        }
    }

    String validar(String link, Rede rede) {
        if (link == null || link.isBlank()) {
            return null;
        }
        String url = link.strip();
        if (!url.contains("://")) {
            url = "https://" + url; // aceita "instagram.com/perfil"
        }
        if (!aceito(url, rede)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Link do " + rede.nome + " inválido: " + link.strip());
        }
        return url;
    }

    private static boolean aceito(String url, Rede rede) {
        try {
            URI uri = new URI(url);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
                return false;
            }
            String host = uri.getHost().toLowerCase().replaceFirst("^(www|m|mobile)\\.", "");
            return rede.dominios.contains(host);
        } catch (URISyntaxException e) {
            return false;
        }
    }
}
