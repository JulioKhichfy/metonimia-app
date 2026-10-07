package br.com.metonimia.pergunta;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Leitura das perguntas frequentes para o site público (sem login). */
@RestController
@RequestMapping("/api/public/perguntas")
public class PerguntaPublicaController {

    private final PerguntaService service;

    public PerguntaPublicaController(PerguntaService service) {
        this.service = service;
    }

    @GetMapping
    public List<PerguntaResponse> listar() {
        return service.listar();
    }
}
