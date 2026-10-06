package br.com.metonimia.publicacao;

import br.com.metonimia.upload.ArmazenamentoService;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Aceita apenas arquivos enviados por /api/admin/uploads e links do YouTube/Vimeo. */
@Component
class MidiaValidator {

    private static final Set<String> HOSTS_VIDEO = Set.of(
            "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
            "youtube-nocookie.com", "www.youtube-nocookie.com",
            "vimeo.com", "www.vimeo.com", "player.vimeo.com");

    private final ArmazenamentoService armazenamento;

    MidiaValidator(ArmazenamentoService armazenamento) {
        this.armazenamento = armazenamento;
    }

    Midia validar(MidiaDto dto) {
        String url = dto.url().trim();
        boolean ok = switch (dto.tipo()) {
            case IMAGEM -> armazenamento.ehLocal(url) && !url.endsWith(".mp4") && !url.endsWith(".webm");
            case VIDEO -> armazenamento.ehLocal(url) && (url.endsWith(".mp4") || url.endsWith(".webm"));
            case VIDEO_LINK -> linkDeVideo(url);
        };
        if (!ok) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mídia inválida: " + url);
        }
        String descricao = dto.descricao() == null ? null : dto.descricao().strip();
        return new Midia(dto.tipo(), url, descricao == null || descricao.isEmpty() ? null : descricao);
    }

    private static boolean linkDeVideo(String url) {
        try {
            URI uri = new URI(url);
            return "https".equalsIgnoreCase(uri.getScheme())
                    && uri.getHost() != null
                    && HOSTS_VIDEO.contains(uri.getHost().toLowerCase());
        } catch (URISyntaxException e) {
            return false;
        }
    }
}
