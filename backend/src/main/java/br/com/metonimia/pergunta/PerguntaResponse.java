package br.com.metonimia.pergunta;

import java.time.Instant;

public record PerguntaResponse(Long id, String pergunta, String resposta, Instant atualizadoEm) {

    static PerguntaResponse de(Pergunta p) {
        return new PerguntaResponse(p.getId(), p.getPergunta(), p.getResposta(), p.getAtualizadoEm());
    }
}
