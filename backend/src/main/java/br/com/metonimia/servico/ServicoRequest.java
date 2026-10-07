package br.com.metonimia.servico;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Dados enviados pelo painel ao criar ou editar um serviço. Texto simples, sem HTML. */
public record ServicoRequest(
        @NotBlank(message = "informe o título") @Size(max = 120, message = "título com no máximo 120 caracteres") String titulo,
        @NotBlank(message = "informe a descrição") @Size(max = 2000, message = "descrição com no máximo 2000 caracteres") String descricao) {}
