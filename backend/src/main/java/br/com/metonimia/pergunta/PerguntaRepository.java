package br.com.metonimia.pergunta;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PerguntaRepository extends JpaRepository<Pergunta, Long> {

    /** Ordem de cadastro: as primeiras cadastradas aparecem primeiro no site. */
    List<Pergunta> findAllByOrderByIdAsc();
}
