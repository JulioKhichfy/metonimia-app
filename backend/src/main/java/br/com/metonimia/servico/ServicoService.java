package br.com.metonimia.servico;

import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ServicoService {

    private final ServicoRepository repositorio;

    public ServicoService(ServicoRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Transactional(readOnly = true)
    public List<ServicoResponse> listar() {
        return repositorio.findAllByOrderByIdAsc().stream().map(ServicoResponse::de).toList();
    }

    @Transactional
    public ServicoResponse criar(ServicoRequest req) {
        Servico s = new Servico();
        aplicar(s, req);
        return ServicoResponse.de(repositorio.save(s));
    }

    @Transactional
    public ServicoResponse atualizar(Long id, ServicoRequest req) {
        Servico s = carregar(id);
        aplicar(s, req);
        s.setAtualizadoEm(Instant.now());
        return ServicoResponse.de(s);
    }

    @Transactional
    public void excluir(Long id) {
        repositorio.delete(carregar(id));
    }

    private Servico carregar(Long id) {
        return repositorio.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Serviço " + id + " não encontrado."));
    }

    private static void aplicar(Servico s, ServicoRequest req) {
        s.setTitulo(req.titulo().strip());
        s.setDescricao(req.descricao().strip());
    }
}
