package br.com.metonimia.pergunta;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** CRUD de perguntas frequentes usado pelo painel. Exige JWT (ver SecurityConfig). */
@RestController
@RequestMapping("/api/admin/perguntas")
public class PerguntaAdminController {

    private final PerguntaService service;

    public PerguntaAdminController(PerguntaService service) {
        this.service = service;
    }

    @GetMapping
    public List<PerguntaResponse> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PerguntaResponse criar(@Valid @RequestBody PerguntaRequest req) {
        return service.criar(req);
    }

    @PutMapping("/{id}")
    public PerguntaResponse atualizar(@PathVariable Long id, @Valid @RequestBody PerguntaRequest req) {
        return service.atualizar(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}
