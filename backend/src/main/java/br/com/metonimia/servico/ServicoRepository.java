package br.com.metonimia.servico;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServicoRepository extends JpaRepository<Servico, Long> {

    /** Ordem de cadastro: os primeiros cadastrados aparecem primeiro no site. */
    List<Servico> findAllByOrderByIdAsc();
}
