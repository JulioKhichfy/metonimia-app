package br.com.metonimia.publicacao;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Única parte pública da API: leitura das palestras/eventos para o site. */
@RestController
@RequestMapping("/api/public/publicacoes")
public class PublicacaoPublicaController {

    private final PublicacaoService service;

    public PublicacaoPublicaController(PublicacaoService service) {
        this.service = service;
    }

    @GetMapping
    public List<PublicacaoResponse> listar(@RequestParam TipoPublicacao tipo) {
        return service.listar(tipo);
    }
}
