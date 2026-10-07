package br.com.metonimia.pergunta;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Dados enviados pelo painel ao criar ou editar uma pergunta frequente. Texto simples, sem HTML. */
public record PerguntaRequest(
        @NotBlank(message = "informe a pergunta") @Size(max = 300, message = "pergunta com no máximo 300 caracteres") String pergunta,
        @NotBlank(message = "informe a resposta") @Size(max = 3000, message = "resposta com no máximo 3000 caracteres") String resposta) {}
