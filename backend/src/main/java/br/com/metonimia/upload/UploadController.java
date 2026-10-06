package br.com.metonimia.upload;

import br.com.metonimia.publicacao.MidiaDto;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/uploads")
public class UploadController {

    private final ArmazenamentoService armazenamento;

    public UploadController(ArmazenamentoService armazenamento) {
        this.armazenamento = armazenamento;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MidiaDto enviar(@RequestParam("arquivo") MultipartFile arquivo) {
        return armazenamento.salvar(arquivo);
    }
}
