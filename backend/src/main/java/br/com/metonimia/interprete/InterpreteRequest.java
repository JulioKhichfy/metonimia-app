package br.com.metonimia.interprete;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * Dados do intérprete enviados pelo painel (parte "dados" do formulário multipart; a foto vai
 * na parte "foto").
 * @param removerFoto true para apagar a foto atual na edição
 */
public record InterpreteRequest(
        @NotBlank(message = "informe o nome completo") @Size(max = 200, message = "nome com no máximo 200 caracteres") String nome,
        @NotNull(message = "informe a data de nascimento") @Past(message = "data de nascimento deve estar no passado") LocalDate dataNascimento,
        @NotBlank(message = "informe o endereço") @Size(max = 300, message = "endereço com no máximo 300 caracteres") String endereco,
        @Email(message = "e-mail inválido") @Size(max = 200, message = "e-mail com no máximo 200 caracteres") String email,
        @NotBlank(message = "informe o celular")
        @Pattern(regexp = "^[\\d\\s()+.-]{10,25}$", message = "celular inválido: use DDD e número, ex.: (21) 99999-9999") String celular,
        Boolean celularWhatsapp,
        Boolean removerFoto) {

    // Boolean (e não boolean): o Jackson 3 recusa campo primitivo ausente no JSON; ausente = false
    public boolean ehWhatsapp() {
        return Boolean.TRUE.equals(celularWhatsapp);
    }

    public boolean deveRemoverFoto() {
        return Boolean.TRUE.equals(removerFoto);
    }
}
