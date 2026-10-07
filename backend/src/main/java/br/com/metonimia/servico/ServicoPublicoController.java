package br.com.metonimia.servico;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Leitura dos serviços para o site público (sem login). */
@RestController
@RequestMapping("/api/public/servicos")
public class ServicoPublicoController {

    private final ServicoService service;

    public ServicoPublicoController(ServicoService service) {
        this.service = service;
    }

    @GetMapping
    public List<ServicoResponse> listar() {
        return service.listar();
    }
}
