package br.com.metonimia.servico;

import java.time.Instant;

public record ServicoResponse(Long id, String titulo, String descricao, Instant atualizadoEm) {

    static ServicoResponse de(Servico s) {
        return new ServicoResponse(s.getId(), s.getTitulo(), s.getDescricao(), s.getAtualizadoEm());
    }
}
