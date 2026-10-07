package br.com.metonimia.interprete;

import java.time.Instant;
import java.time.LocalDate;

/** A foto não vem aqui: é baixada à parte em /api/admin/interpretes/{id}/foto (exige login). */
public record InterpreteResponse(
        Long id,
        String nome,
        LocalDate dataNascimento,
        String endereco,
        String email,
        String celular,
        boolean celularWhatsapp,
        boolean temFoto,
        Instant atualizadoEm) {

    static InterpreteResponse de(Interprete i) {
        return new InterpreteResponse(i.getId(), i.getNome(), i.getDataNascimento(), i.getEndereco(), i.getEmail(),
                i.getCelular(), i.isCelularWhatsapp(), i.getFoto() != null, i.getAtualizadoEm());
    }
}
