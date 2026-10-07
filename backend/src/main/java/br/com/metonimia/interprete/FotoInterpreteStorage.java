package br.com.metonimia.interprete;

import br.com.metonimia.common.AssinaturaArquivo;
import br.com.metonimia.config.AppProperties;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Fotos de intérpretes em pasta PRIVADA ({privado}/interpretes/{uuid}.{ext}).
 * Diferente de /uploads, esta pasta não é servida pelo Caddy: a foto só sai pela API, com login.
 */
@Component
class FotoInterpreteStorage {

    private static final Logger log = LoggerFactory.getLogger(FotoInterpreteStorage.class);
    private static final long LIMITE = 5L * 1024 * 1024;
    private static final Pattern NOME = Pattern.compile("^[0-9a-f-]{36}\\.(jpg|png|webp)$");
    private static final Map<String, String> EXTENSOES = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp");
    private static final Map<String, MediaType> TIPOS = Map.of(
            "jpg", MediaType.IMAGE_JPEG,
            "png", MediaType.IMAGE_PNG,
            "webp", MediaType.parseMediaType("image/webp"));

    record Foto(Path arquivo, MediaType tipo) {}

    private final Path pasta;

    FotoInterpreteStorage(AppProperties props) {
        String diretorio = props.privado() == null ? null : props.privado().diretorio();
        this.pasta = Path.of(diretorio == null || diretorio.isBlank() ? "./privado" : diretorio)
                .resolve("interpretes").toAbsolutePath().normalize();
        try {
            Files.createDirectories(pasta);
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível criar a pasta privada: " + pasta, e);
        }
    }

    /** Grava a foto e devolve o nome do arquivo. */
    String salvar(MultipartFile arquivo) {
        String extensao = EXTENSOES.get(String.valueOf(arquivo.getContentType()).toLowerCase());
        if (extensao == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Foto deve ser JPG, PNG ou WEBP.");
        }
        if (arquivo.getSize() > LIMITE) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Foto maior que 5 MB.");
        }
        if (!AssinaturaArquivo.confere(arquivo, extensao)) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                    "O conteúdo da foto não corresponde ao formato informado.");
        }
        String nome = UUID.randomUUID() + "." + extensao;
        try (InputStream in = arquivo.getInputStream()) {
            Files.copy(in, pasta.resolve(nome));
        } catch (IOException e) {
            throw new UncheckedIOException("Falha ao gravar a foto", e);
        }
        return nome;
    }

    Optional<Foto> abrir(String nome) {
        if (nome == null || !NOME.matcher(nome).matches()) {
            return Optional.empty();
        }
        Path arquivo = pasta.resolve(nome);
        return Files.isRegularFile(arquivo)
                ? Optional.of(new Foto(arquivo, TIPOS.get(nome.substring(nome.lastIndexOf('.') + 1))))
                : Optional.empty();
    }

    void excluir(String nome) {
        if (nome == null || !NOME.matcher(nome).matches()) {
            return;
        }
        try {
            Files.deleteIfExists(pasta.resolve(nome));
        } catch (IOException e) {
            log.warn("Não foi possível apagar a foto {}: {}", nome, e.getMessage());
        }
    }
}
