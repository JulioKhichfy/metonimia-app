package br.com.metonimia.publicacao;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

/** Dados enviados pelo painel ao criar ou editar uma palestra/evento. */
public record PublicacaoRequest(
        @NotNull(message = "informe o tipo") TipoPublicacao tipo,
        @NotNull(message = "informe a data e a hora") Instant dataHora,
        @NotBlank(message = "informe o local") @Size(max = 300, message = "local com no máximo 300 caracteres") String local,
        @Size(max = 200_000, message = "descrição longa demais") String descricaoHtml,
        @NotNull @Pattern(regexp = "^#[0-9a-fA-F]{6}$", message = "cor de fundo deve estar no formato #RRGGBB") String corFundo,
        @Size(max = 40, message = "no máximo 40 fotos e vídeos") List<@Valid MidiaDto> midias) {}
