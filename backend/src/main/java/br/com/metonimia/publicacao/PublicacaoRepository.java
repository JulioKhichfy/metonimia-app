package br.com.metonimia.publicacao;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PublicacaoRepository extends JpaRepository<Publicacao, Long> {

    /** Já traz as mídias junto, evitando uma consulta extra por publicação. */
    @EntityGraph(attributePaths = "midias")
    List<Publicacao> findAllByTipoOrderByDataHoraDesc(TipoPublicacao tipo);

    @EntityGraph(attributePaths = "midias")
    Optional<Publicacao> findWithMidiasById(Long id);
}
