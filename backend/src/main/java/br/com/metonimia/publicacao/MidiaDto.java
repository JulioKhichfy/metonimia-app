package br.com.metonimia.publicacao;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record MidiaDto(
        @NotNull TipoMidia tipo,
        @NotBlank @Size(max = 1000) String url,
        @Size(max = 500) String descricao) {

    static MidiaDto de(Midia m) {
        return new MidiaDto(m.getTipo(), m.getUrl(), m.getDescricao());
    }
}
