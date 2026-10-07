package br.com.metonimia.servico;

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

/** CRUD de serviços usado pelo painel. Exige JWT (ver SecurityConfig). */
@RestController
@RequestMapping("/api/admin/servicos")
public class ServicoAdminController {

    private final ServicoService service;

    public ServicoAdminController(ServicoService service) {
        this.service = service;
    }

    @GetMapping
    public List<ServicoResponse> listar() {
        return service.listar();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServicoResponse criar(@Valid @RequestBody ServicoRequest req) {
        return service.criar(req);
    }

    @PutMapping("/{id}")
    public ServicoResponse atualizar(@PathVariable Long id, @Valid @RequestBody ServicoRequest req) {
        return service.atualizar(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void excluir(@PathVariable Long id) {
        service.excluir(id);
    }
}
