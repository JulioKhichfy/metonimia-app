package br.com.metonimia.interprete;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Cadastro de intérpretes e envio de mensagens. Tudo exige JWT (ver SecurityConfig).
 * Criar/editar usa multipart: parte "dados" (JSON) + parte "foto" (opcional).
 */
@RestController
@RequestMapping("/api/admin/interpretes")
public class InterpreteController {

    private final InterpreteService service;
    private final MensagemService mensagens;

    public InterpreteController(InterpreteService service, MensagemService mensagens) {
        this.service = service;
        this.mensagens = mensagens;
    }

    @GetMapping
    public List<InterpreteResponse> listar() {
        return service.listar();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public InterpreteResponse criar(@Valid @RequestPart("dados") InterpreteRequest dados,
            @RequestPart(value = "foto", required = false) MultipartFile foto) {
        return service.criar(dados, foto);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public InterpreteResponse atualizar(@PathVariable Long id, @Valid @RequestPart("dados") InterpreteRequest dados,
            @RequestPart(value = "foto", required = false) MultipartFile foto) {
        return service.atualizar(id, dados, foto);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }

    /** A foto só sai por aqui, com login. "private": proxies e CDNs não guardam cópia. */
    @GetMapping("/{id}/foto")
    public ResponseEntity<Resource> foto(@PathVariable Long id) {
        return service.foto(id)
                .<ResponseEntity<Resource>>map(f -> ResponseEntity.ok()
                        .contentType(f.tipo())
                        .cacheControl(CacheControl.noCache().cachePrivate())
                        .body(new FileSystemResource(f.arquivo())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Informa ao painel se o envio de e-mail está configurado, para avisar antes de escrever. */
    @GetMapping("/mensagens/configuracao")
    public Map<String, Boolean> configuracaoMensagens() {
        return Map.of("emailConfigurado", mensagens.emailConfigurado());
    }

    @PostMapping("/mensagens")
    public MensagemResponse enviarMensagem(@Valid @RequestBody MensagemRequest req) {
        return mensagens.enviar(req);
    }
}
