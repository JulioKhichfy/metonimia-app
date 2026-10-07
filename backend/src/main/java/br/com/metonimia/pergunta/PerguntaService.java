package br.com.metonimia.pergunta;

import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PerguntaService {

    private final PerguntaRepository repositorio;

    public PerguntaService(PerguntaRepository repositorio) {
        this.repositorio = repositorio;
    }

    @Transactional(readOnly = true)
    public List<PerguntaResponse> listar() {
        return repositorio.findAllByOrderByIdAsc().stream().map(PerguntaResponse::de).toList();
    }

    @Transactional
    public PerguntaResponse criar(PerguntaRequest req) {
        Pergunta p = new Pergunta();
        aplicar(p, req);
        return PerguntaResponse.de(repositorio.save(p));
    }

    @Transactional
    public PerguntaResponse atualizar(Long id, PerguntaRequest req) {
        Pergunta p = carregar(id);
        aplicar(p, req);
        p.setAtualizadoEm(Instant.now());
        return PerguntaResponse.de(p);
    }

    @Transactional
    public void excluir(Long id) {
        repositorio.delete(carregar(id));
    }

    private Pergunta carregar(Long id) {
        return repositorio.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pergunta " + id + " não encontrada."));
    }

    private static void aplicar(Pergunta p, PerguntaRequest req) {
        p.setPergunta(req.pergunta().strip());
        p.setResposta(req.resposta().strip());
    }
}
