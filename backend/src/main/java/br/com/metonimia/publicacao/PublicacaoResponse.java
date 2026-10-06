package br.com.metonimia.publicacao;

import java.time.Instant;
import java.util.List;

public record PublicacaoResponse(
        Long id,
        TipoPublicacao tipo,
        Instant dataHora,
        String local,
        String descricaoHtml,
        String corFundo,
        List<MidiaDto> midias,
        boolean futura,
        Instant atualizadoEm) {

    static PublicacaoResponse de(Publicacao p, Instant agora) {
        return new PublicacaoResponse(
                p.getId(),
                p.getTipo(),
                p.getDataHora(),
                p.getLocal(),
                p.getDescricaoHtml(),
                p.getCorFundo(),
                p.getMidias().stream().map(MidiaDto::de).toList(),
                p.futura(agora),
                p.getAtualizadoEm());
    }
}
