package br.com.metonimia.publicacao;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** CRUD usado pelo painel. Exige JWT (ver SecurityConfig). */
@RestController
@RequestMapping("/api/admin/publicacoes")
public class PublicacaoAdminController {

    private final PublicacaoService service;

    public PublicacaoAdminController(PublicacaoService service) {
        this.service = service;
    }

    @GetMapping
    public List<PublicacaoResponse> listar(@RequestParam TipoPublicacao tipo) {
        return service.listar(tipo);
    }

    @GetMapping("/{id}")
    public PublicacaoResponse buscar(@PathVariable Long id) {
        return service.buscar(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PublicacaoResponse criar(@Valid @RequestBody PublicacaoRequest req) {
        return service.criar(req);
    }

    @PutMapping("/{id}")
    public PublicacaoResponse atualizar(@PathVariable Long id, @Valid @RequestBody PublicacaoRequest req) {
        return service.atualizar(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}
