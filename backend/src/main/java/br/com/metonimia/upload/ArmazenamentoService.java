package br.com.metonimia.upload;

import br.com.metonimia.config.AppProperties;
import br.com.metonimia.publicacao.MidiaDto;
import br.com.metonimia.publicacao.TipoMidia;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Guarda fotos e vídeos em disco: {diretorio}/AAAA/MM/{uuid}.{ext}, publicados em /uploads/AAAA/MM/...
 * O tipo é conferido pelos primeiros bytes do arquivo, não só pela extensão.
 */
@Service
public class ArmazenamentoService {

    private static final Logger log = LoggerFactory.getLogger(ArmazenamentoService.class);
    private static final String PREFIXO_URL = "/uploads/";
    private static final Pattern URL_LOCAL =
            Pattern.compile("^/uploads/\\d{4}/\\d{2}/[0-9a-f-]{36}\\.(jpg|png|webp|gif|mp4|webm)$");

    private static final long MB = 1024L * 1024L;
    private static final long LIMITE_IMAGEM = 10 * MB;
    private static final long LIMITE_VIDEO = 200 * MB;

    private record Formato(String extensao, TipoMidia tipo) {}

    private static final Map<String, Formato> FORMATOS = Map.of(
            "image/jpeg", new Formato("jpg", TipoMidia.IMAGEM),
            "image/png", new Formato("png", TipoMidia.IMAGEM),
            "image/webp", new Formato("webp", TipoMidia.IMAGEM),
            "image/gif", new Formato("gif", TipoMidia.IMAGEM),
            "video/mp4", new Formato("mp4", TipoMidia.VIDEO),
            "video/webm", new Formato("webm", TipoMidia.VIDEO));

    private final Path raiz;

    public ArmazenamentoService(AppProperties props) {
        String diretorio = props.upload() == null ? null : props.upload().diretorio();
        this.raiz = Path.of(diretorio == null || diretorio.isBlank() ? "./uploads" : diretorio)
                .toAbsolutePath().normalize();
        try {
            Files.createDirectories(raiz);
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível criar a pasta de uploads: " + raiz, e);
        }
        log.info("Uploads em {}", raiz);
    }

    public Path raiz() {
        return raiz;
    }

    public MidiaDto salvar(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nenhum arquivo enviado.");
        }
        Formato formato = FORMATOS.get(String.valueOf(arquivo.getContentType()).toLowerCase());
        if (formato == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "Formato não aceito. Envie JPG, PNG, WEBP, GIF, MP4 ou WEBM.");
        }
        long limite = formato.tipo() == TipoMidia.IMAGEM ? LIMITE_IMAGEM : LIMITE_VIDEO;
        if (arquivo.getSize() > limite) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "Arquivo maior que " + (limite / MB) + " MB.");
        }
        if (!conteudoConfere(arquivo, formato.extensao())) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "O conteúdo do arquivo não corresponde ao formato informado.");
        }

        LocalDate hoje = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        String relativo = "%d/%02d/%s.%s".formatted(hoje.getYear(), hoje.getMonthValue(), UUID.randomUUID(), formato.extensao());
        Path destino = raiz.resolve(relativo).normalize();
        try (InputStream in = arquivo.getInputStream()) {
            Files.createDirectories(destino.getParent());
            Files.copy(in, destino);
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao gravar " + destino, e);
        }
        return new MidiaDto(formato.tipo(), PREFIXO_URL + relativo, null);
    }

    /** true se a URL aponta para um arquivo enviado por esta aplicação. */
    public boolean ehLocal(String url) {
        return url != null && URL_LOCAL.matcher(url).matches();
    }

    public void excluir(String url) {
        if (!ehLocal(url)) {
            return;
        }
        Path arquivo = raiz.resolve(url.substring(PREFIXO_URL.length())).normalize();
        if (!arquivo.startsWith(raiz)) {
            return;
        }
        try {
            Files.deleteIfExists(arquivo);
        } catch (IOException e) {
            log.warn("Não foi possível apagar {}: {}", arquivo, e.getMessage());
        }
    }

    /** Confere a "assinatura" (magic bytes) do arquivo. */
    private static boolean conteudoConfere(MultipartFile arquivo, String extensao) {
        byte[] b;
        try (InputStream in = arquivo.getInputStream()) {
            b = in.readNBytes(16);
        } catch (IOException e) {
            return false;
        }
        return switch (extensao) {
            case "jpg" -> comeca(b, 0, 0xFF, 0xD8, 0xFF);
            case "png" -> comeca(b, 0, 0x89, 0x50, 0x4E, 0x47);
            case "gif" -> texto(b, 0, "GIF8");
            case "webp" -> texto(b, 0, "RIFF") && texto(b, 8, "WEBP");
            case "mp4" -> texto(b, 4, "ftyp");
            case "webm" -> comeca(b, 0, 0x1A, 0x45, 0xDF, 0xA3);
            default -> false;
        };
    }

    private static boolean comeca(byte[] b, int desloc, int... esperado) {
        if (b.length < desloc + esperado.length) {
            return false;
        }
        for (int i = 0; i < esperado.length; i++) {
            if ((b[desloc + i] & 0xFF) != esperado[i]) {
                return false;
            }
        }
        return true;
    }

    private static boolean texto(byte[] b, int desloc, String esperado) {
        byte[] e = esperado.getBytes(StandardCharsets.US_ASCII);
        return b.length >= desloc + e.length && Arrays.equals(b, desloc, desloc + e.length, e, 0, e.length);
    }
}
