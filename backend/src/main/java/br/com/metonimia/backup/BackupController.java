package br.com.metonimia.backup;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Download do backup do banco pelo painel. Exige JWT (ver SecurityConfig). */
@RestController
@RequestMapping("/api/admin/backup")
public class BackupController {

    private static final DateTimeFormatter NOME = DateTimeFormatter.ofPattern("yyyy-MM-dd-HHmm");
    private static final ZoneId BRASILIA = ZoneId.of("America/Sao_Paulo");

    private final BackupService service;

    public BackupController(BackupService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<byte[]> baixar() {
        String arquivo = "metonimia-backup-" + LocalDateTime.now(BRASILIA).format(NOME) + ".sql";
        return ResponseEntity.ok()
                .contentType(new MediaType("application", "sql", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(arquivo).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(service.gerar().getBytes(StandardCharsets.UTF_8));
    }
}
